# It works!

There are two separate applications to the solution.  We have our 'feature' application and we have our 'consumer' application.  I built the feature app as an Angular Library, because it is easily published to NPM, and therefore a CDN (thanks unpkg!).  If we decide our feature apps shouldn't be libraries, then we need to figure out a way to package and version them without the angular runtime/polyfill/etc.

Both the Feature app and the Consumer app are in Angular 10.

NOTE: It doesn't really matter what we use for a CDN.  None of the next steps require a fancy Amazon solution, complete with versioning.  Those things are required eventually, but for local testing, you can literally host the javascript on your local machine.  In order to get it to work, you simply need to be able to make an http call and get a string back.

## Feature Application

I used an [Angular Library](https://angular.io/guide/creating-libraries) to represent my feature app.  My library has one module, one component, and one service.  I'm unaware of any limits though, so it should be easily expandable.  

* Make sure to add your component to the `exports` array in the module.
* Make sure to compile the library using Ivy.  Ivy is the new standard for angular compilation and rendering.  It follows an AOT (ahead of time) scheme, rather than a JIT (just in time) scheme from the old View Engine days.  This setting is found in the lib's tsconfig.lib.prod.json file.
  * NOTE: The internet will tell you that it isn't best practice to use Ivy when compiling libraries.  This is because it limits the backward-compatibility of the library.  This shouldn't affect our usage, but still worth noting.

----

## Consumer Application

My consumer app is a standard Angular 10 app created via the Angular CLI.  All the magic can be found in home.component.ts.

In that file's html template, you will find the element `<ng-template>`.  This is where our async code is going to get rendered.

The `load()` function is called when you click the `load` button.  That function does the following (I recommend stepping through this with a debugger to get a good understanding of what's happening).
* http call to CDN to download the library as a string of javascript code.  `res` is simply a string.
* declare `exports` as an empty object.  This object will get populated via the downloaded javascript, specifically these lines:
  ```
    exports.MyLibComponent = MyLibComponent;
    exports.MyLibModule = MyLibModule;
    exports.MyLibService = MyLibService;
  ```
* declare `dependencies` as an object, and provide a reference to all of the async code's dependencies.  The downloaded javascript will call `require()` for every one of its dependencies.  Because this code is going to execute in the scope of `load()`, it doesn't know what `require()` means, so we have to manually provide each of the dependencies.  My simple example only requires `@angular/core`.  You can search the downloaded javascript for all `require()` calls to determine which libs/modules it is dependent on.
* declare `require()` function.  This is the function the downloaded code will call each time it asks for a dependency.  This is where you use the `dependencies` object to hand it the libs/modules it needs.
* `eval()`.  This will actually execute the downloaded javascript string.  You should see the `exports` object populated after this step.
* `this.compiler.compileModuleAndAllComponentsSync()`.  Pass this function the module object that should now be in `exports` and it will run it through the Angular compiler.  This is where I experienced the majority of errors.  If you are running into problems, it's likely because the downloaded javascript isn't valid (eg. wasn't compiled using Ivy).  This function returns an array of component and module factories that can be used in rendering.  In my very simple example, I'm just grabbing the first component factory from the list, because there is only one, but they can be selected via element selector also.
* `this.containerRef.createComponent()` This function actually renders the component, by passing the reference to the component factory.

-----

## Outstanding Questions
There are a number of questions yet to be answered.  Our best bet for answering them will be to make a more complex POC inside our application.

1. How can our 'feature modules' interact with global services?
    * because the code is executing in the scope of the parent container, we could theoretically pass it a reference to any required service via the `dependencies` object.  However, this doesn't explain how a feature team might build out the feature at develop-time, because they would need a direct reference to test.  
    * One suggestion is to extract our global services out to their own libs that can be referenced via package manager (npm) or cdn.  The goal would be to get the downloaded 'feature code' to simply `require()` the service, so we can resolve the dependency at runtime.
2. Similar to #1, how do feature module Ionic dependencies work?
    * I expect this to be easier than #1, since they can simply install the node package.  I would assume that when building the code, the ionic code is omitted, and we're left with a simple `require()` function that we can handle.
    * Need to confirm this with a feature within our app, or with a new Ionic app for POC.
3. If a feature module has assets (images, css sheets, etc), how are they delivered?
    * No idea how these are delivered.  CSS may be 'inline' in the javascript, but if there are images, I just don't know.
    * If images are a problem, we could solve it by hosting ALL images separately, and the code will simply reference it via URL.
4. Complex feature module, complete with routing?
    * Many (most? all?) of our feature teams have their own sub-router.  Is this going to play nicely?  How do we integrate that?
5. Runtime compilation requires adding the compiler to the bundle.  This is a large dependency that may increase our bundle sizes significantly.  Just something we want to check, after we POC inside the application.
6. What's the dev experience like for a feature team?
    * I would hope that it's simply `ng start` when building out their library, but how can they test it INSIDE the application without deploying?
    * They could simply do an http request to some location on their machine, but we need to document some best practices here.
7. Fallback option.  What if the device can't reach the CDN.
    * I think a good solution for this is to save the payload in local storage after each successful download.  We'll always try and stay fresh, but if the external call fails, we could use the stored value as a backup.
    * For this to work, we'd need to also track what VERSION of the feature module we have saved.
    