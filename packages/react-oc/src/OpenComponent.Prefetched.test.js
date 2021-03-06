import 'jest-plugin-console-matchers/setup';
import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import jQuery from 'jquery';
import Promise from 'bluebird';

import { renderAsync } from './__test__/react-helpers'
import { OpenComponentsContext } from "./OpenComponentsContext";
import { OCContext } from "./OCContext";
import { OpenComponent } from "./OpenComponent";

describe('<OpenComponent />', () => {
    const callCountScript = 'window.callCount = window.callCount || 0; window.callCount++;'
    beforeEach(() => {
        delete window.callCount;
        document.body.innerHTML = '';
    });
    
    describe('When not mounted within a <ComponentContext />', () => {
        it('throws an error', () => {
            const node = document.createElement('div');
            return expect(renderAsync(<OpenComponent.Prefetched prefetchKey='my-component' />, node)).rejects
                .toThrow(/must be nested within a <ComponentContext \/>/);
        });
    });

    let baseContext, baseContextServer;
    beforeEach(() => {
        baseContext = { 
            getElement: jest.fn(() => {}), 
            getHtml: jest.fn(() => 'hello world'),
            saveElement: jest.fn(() => {}),
            oc: {
                renderNestedComponent: jest.fn((_, cb) => cb()),
                $: jQuery,
            }
        };

        baseContextServer = {
            getElement: baseContext.getElement,
            getHtml: baseContext.getHtml,
            saveElement: baseContext.saveElement,
        };
    });

    it('throws an error if prefetchKey prop was not defined', () => {
        const node = document.createElement('div');
        return expect(renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched />
            </OCContext.Provider>, node)
        ).rejects.toThrow(/Mandatory prop 'prefetchKey' was not provided/);
    });

    it('should apply the given id to a container div', async () => {
        const node = document.createElement('div');
        await renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched id='my-unique-id' prefetchKey='my-component' />
            </OCContext.Provider>, node);

        expect(node.childNodes[0].id).toBe('my-unique-id');
    });

    it('should apply the given className to a container div', async () => {
        const node = document.createElement('div');
        await renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched className='my-class' prefetchKey='my-component' />
            </OCContext.Provider>, node);

        expect(node.childNodes[0].className).toBe('my-class');
    });

    it('renders an empty div if no html is provided by context.getHtml', async () => {
        const node = document.createElement('div');
        baseContext.getHtml.mockImplementation(() => undefined)
        await renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>, node);

        expect(node.innerHTML).toBe('<div></div>');
    });

    it('renders the fallback if no html is provided by context.getHtml and fallback is provided', async () => {
        const node = document.createElement('div');
        baseContext.getHtml.mockImplementation(() => undefined)
        await renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched prefetchKey='my-component' fallback={`<span>Hello world</span>`} />
            </OCContext.Provider>, node);

        expect(node.innerHTML).toBe('<div><span>Hello world</span></div>');
    });

    it('should render markup from context.getHtml with prefetchKey in container div', async () => {
        const node = document.createElement('div');
        const fakeHtml = `<h1>Hello world</h1>`;
        baseContext.getHtml.mockImplementation((key) => key === 'my-component' ? fakeHtml : undefined )
        await renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>, node);

        expect(node.innerHTML).toContain(fakeHtml);
    });

    it('should run any scripts from context.getHtml with prefetchKey in container div', async () => {
        const node = document.createElement('div');
        document.body.append(node);
        const fakeHtml = `<h1>Hello world</h1><script>${callCountScript}</script>`;
        baseContext.getHtml.mockImplementation((key) => key === 'my-component' ? fakeHtml : undefined )
        await renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>, node);

        expect(window.callCount).toBe(1);
    });

    describe('when getHtml returns an unrendered oc-component tag', () => {
        const fakeHtml = `<oc-component data-rendered="false" name="my-component"></oc-component>`;
        it('should call oc.renderNestedComponent', async () => {
            const node = document.createElement('div');
            baseContext.getHtml.mockImplementation(() => fakeHtml)
            await renderAsync(
                <OCContext.Provider value={{...baseContext}}>
                    <OpenComponent.Prefetched prefetchKey='my-component' />
                </OCContext.Provider>, node);

            expect(baseContext.oc.renderNestedComponent).toBeCalledWith(expect.objectContaining({
                jquery: expect.anything(),
                0: expect.objectContaining({ outerHTML: fakeHtml })
            }), expect.anything());
        })
    });

    it('should render markup from context.getHtml with prefetchKey in container div', async () => {
        const node = document.createElement('div');
        const fakeHtml = `<h1>Hello world</h1>`;
        baseContext.getHtml.mockImplementation((key) => key === 'my-component' ? fakeHtml : undefined )
        await renderAsync(
            <OCContext.Provider value={{...baseContext}}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>, node);

        expect(node.innerHTML).toContain(fakeHtml);
    });

    describe('when server side rendering', () => {
        it('should render markup from context.getHtml with prefetchKey in container div', () => {
            const fakeHtml = `<h1>Hello world</h1>`;
            baseContextServer.getHtml.mockImplementation((key) => key === 'my-component' ? fakeHtml : undefined )
            const render = ReactDOMServer.renderToString(
                <OCContext.Provider value={{...baseContextServer}}>
                    <OpenComponent.Prefetched prefetchKey='my-component' />
                </OCContext.Provider>);
    
            expect(render).toContain(fakeHtml);
        });
    });

    describe('when hydrating over server side rendered markup', () => {
        it('should not change markup', async () => {
            const node = document.createElement('div');
            node.innerHTML = ReactDOMServer.renderToString(<OCContext.Provider value={{
                ...baseContextServer, getHtml: () => '<h1>Hello</h1><p>World</p>' }}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>);
            const existingMarkup = node.innerHTML;
    
            await new Promise((resolve) => ReactDOM.hydrate(
                <OCContext.Provider value={{...baseContext, getHtml: () => undefined }}>
                    <OpenComponent.Prefetched prefetchKey='my-component' />
                </OCContext.Provider>, node, resolve));
    
            expect(node.innerHTML).toBe(existingMarkup);
        });
    
        it('should warn if getHtml provides a different value than server', async () => {
            const node = document.createElement('div');
            node.innerHTML = ReactDOMServer.renderToString(<OCContext.Provider value={{
                ...baseContextServer, getHtml: () => '<h1>Hello</h1><p>World</p>' }}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>);
            const existingMarkup = node.innerHTML;
            
            const expectedWarning = /Warning: Prop `[^`]+` did not match./
            suppress.console('error', expectedWarning);
    
            await new Promise((resolve) => ReactDOM.hydrate(
                <OCContext.Provider value={{...baseContext, getHtml: () => '<h1>Goodbye</h1><p>Universe</p>' }}>
                    <OpenComponent.Prefetched prefetchKey='my-component' />
                </OCContext.Provider>, node, resolve));
    
            expect(console.error).toHaveBeenCalledWith(
                expect.stringMatching(expectedWarning),
                'dangerouslySetInnerHTML',
                expect.anything(),
                expect.anything(),
            );
        });
    
        it('should not run script tags again', async () => {
            const node = document.createElement('div');
            document.body.append(node);
            node.innerHTML = ReactDOMServer.renderToString(<OCContext.Provider value={{
                ...baseContextServer, getHtml: () => `<h1>Hello</h1><p>World</p><script>${callCountScript}</script>` }}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>);

            // simulate browser called script tag.
            eval(callCountScript);
            const existingMarkup = node.innerHTML;
    
            await new Promise((resolve) => ReactDOM.hydrate(
                <OCContext.Provider value={{...baseContext, getHtml: () => undefined }}>
                    <OpenComponent.Prefetched prefetchKey='my-component' />
                </OCContext.Provider>, node, resolve));
    
            expect(window.callCount).toBe(1);
        });

        it('should run script tags again if getHtml returns the same markup during hydration', async () => {
            const node = document.createElement('div');
            document.body.append(node);
            const fakeMarkup = `<h1>Hello</h1><p>World</p><script>${callCountScript}</script>`;
            node.innerHTML = ReactDOMServer.renderToString(<OCContext.Provider value={{
                ...baseContextServer, getHtml: () => fakeMarkup }}>
                <OpenComponent.Prefetched prefetchKey='my-component' />
            </OCContext.Provider>);

            // simulate browser called script tag.
            eval(callCountScript);
            const existingMarkup = node.innerHTML;
    
            await new Promise((resolve) => ReactDOM.hydrate(
                <OCContext.Provider value={{...baseContext, getHtml: () => fakeMarkup }}>
                    <OpenComponent.Prefetched prefetchKey='my-component' />
                </OCContext.Provider>, node, resolve));
    
            expect(window.callCount).toBe(2);
        });
    });

    describe('when given a captureAs prop', () => {
        it('calls saveElements on context with the captureAs value and elements from getHtml', async () => {
            const node = document.createElement('div');
            const html = '<div>hello</div><h1>world</h1>';
            const saveElements = jest.fn();
            const getElements = jest.fn();
            
            await renderAsync(
                <OCContext.Provider value={{...baseContext, saveElements, getElements, getHtml: () => html}}>
                    <OpenComponent.Prefetched prefetchKey='my-component' captureAs='my-component-1' />
                </OCContext.Provider>, node);
    
            expect(saveElements).toBeCalledWith('my-component-1', [
                expect.objectContaining({
                    innerHTML: 'hello',
                    tagName: 'DIV'
                }),
                expect.objectContaining({
                    innerHTML: 'world',
                    tagName: 'H1'
                }),
            ]);
        });

        describe('when context.getElements returns a html element', () => {
            it('calls getElements with the captureAs key', async () => {
                const node = document.createElement('div');
                const element = document.createElement('span');
                const getElements = jest.fn().mockImplementation((key) => element);
                await renderAsync(
                    <OCContext.Provider value={{...baseContext, getElements}}>
                        <OpenComponent.Prefetched prefetchKey='my-component' captureAs='my-component-1' />
                    </OCContext.Provider>, node);
                
                expect(getElements).toBeCalledWith('my-component-1');
            });

            it('injects the elements into the container', async () => {
                const node = document.createElement('div');
                
                const prevNode = document.createElement('span');
                prevNode.innerHTML = '<span>span</span>hello<div>div</div>';
                const elements = [...prevNode.childNodes];

                const getElements = jest.fn().mockImplementation((key) => elements)
                await renderAsync(
                    <OCContext.Provider value={{...baseContext, getElements}}>
                        <OpenComponent.Prefetched prefetchKey='my-component' captureAs='my-component-1' />
                    </OCContext.Provider>, node);

                const div = node.childNodes[0];
                expect(div.childNodes.length).toBe(elements.length);
                for(var i = 0; i < elements.length; i++) {
                    // using toBe ensures that it is the same element with 
                    // all event handlers etc. in-tact.
                    expect(div.childNodes[i]).toBe(elements[i]);
                }
            });
        });
    });
});