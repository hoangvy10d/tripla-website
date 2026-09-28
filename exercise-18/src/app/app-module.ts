import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { PeopleLoad } from './people-load/people-load';


@NgModule({
  declarations: [App, PeopleLoad],
  imports: [BrowserModule, AppRoutingModule],
  providers: [provideBrowserGlobalErrorListeners(),provideHttpClient()
],
  bootstrap: [App],
})
export class AppModule {}
