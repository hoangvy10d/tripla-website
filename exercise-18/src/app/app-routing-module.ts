import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PeopleLoad } from './people-load/people-load';

const routes: Routes = [
  {path: '', redirectTo: 'people-load', pathMatch: 'full'},
  {path: 'people-load' ,component:PeopleLoad }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
