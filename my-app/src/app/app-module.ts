import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { ProductService } from './service/product-service';
import { ServiceProductImageEvent } from './service-product-image-event/service-product-image-event';




@NgModule({
  declarations: [App,ServiceProductImageEvent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
