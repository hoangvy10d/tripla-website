import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerGroup} from '../classes/IPeople';

@Injectable({
    providedIn: 'root'
})
export class ProductHttpService {
    private _url: string = './data/customers.json';
    constructor(private http: HttpClient ) { }

    getCustomerList(): Observable<CustomerGroup[]> {
        return this.http.get<CustomerGroup[]>(this._url);
    }
}
