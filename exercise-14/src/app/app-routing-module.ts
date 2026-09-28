import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CategoryLoad } from './category-load/category-load';

const routes: Routes = [
  {path: '', redirectTo: 'category-load', pathMatch: 'full' },
  {path:"category-load", component: CategoryLoad}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
