import { Compiler, Component, Injector, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import * as AngularCore from '@angular/core';
import { HttpClient } from '@angular/common/http';



@Component({
  selector: 'app-home',
  template: `
    <h1>
      HomePage
    </h1>
    <button (click)="load()">Load</button>
    <ng-template #pluginHost>
      blah blah
    </ng-template>
  `,
  styles: [
  ]
})
export class HomeComponent implements OnInit {

  @ViewChild('pluginHost') pluginHost;

  constructor(
    private compiler: Compiler,
    private injector: Injector,
    private containerRef: ViewContainerRef,
    private httpClient: HttpClient,
  ) { }

  ngOnInit(): void {
  }

  load(): void {
    this.httpClient.get('https://unpkg.com/bentest_my-lib', { responseType: 'text' }).subscribe(res => {

      const exports = {};
      const dependencies = {
        '@angular/core': AngularCore
      };

      const require = (dependency) => dependencies[dependency];

      eval(res);

      const asyncLibModuleObject = exports['MyLibModule'];

      const modCompFactories = this.compiler.compileModuleAndAllComponentsSync(asyncLibModuleObject);
      const componentFactory = modCompFactories.componentFactories[0];
      if (componentFactory) {
        this.containerRef.clear();
        const componentRef = this.containerRef.createComponent(componentFactory);
      }

      console.log('done');
    })
  }

}
