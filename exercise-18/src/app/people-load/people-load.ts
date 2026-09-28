import { ChangeDetectorRef, Component } from '@angular/core';
import { ProductHttpService } from '../service/product-http-service';
import { CustomerGroup } from '../classes/IPeople';

@Component({
  selector: 'app-people-load',
  standalone: false,
  templateUrl: './people-load.html',
  styleUrl: './people-load.css'
})
export class PeopleLoad {

  customers: any;

  constructor(private _service: ProductHttpService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this._service.getCustomerList().subscribe({
      next: (data) => {
        console.log('DATA:', data);
        this.customers = data;
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error('ERROR:', err);
      }
    });
  }
}