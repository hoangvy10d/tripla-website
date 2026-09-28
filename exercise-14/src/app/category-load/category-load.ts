import { Component } from '@angular/core';
import { CatalogService } from '../service/catalog-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-category-load',
  standalone: false,
  styleUrl: './category-load.css',
  templateUrl: './category-load.html',
})
export class CategoryLoad {public products:any
  constructor(pservice: CatalogService, private router:Router) {
    this.products=pservice.getCategories()
  }

}
