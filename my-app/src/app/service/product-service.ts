import { Service } from '@angular/core';

@Service()
export class ProductService {
    ProductsImage= [
      {
        "id": 1,
        "name": "Tiger",
        "price": 10.99,
        "description": "This is Product 1",
        "imageUrl": "https://img.onelife.vn/P1nnYV1s4bCxmWvLIrz2g2padPOOvt9TYu14Giko-TI/rs:fit:600:600:1/aHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL3NjX3BjbV9wcm9kdWN0L3Byb2QvMjAyNS8yLzE5LzYxODc5NS04OTM1MDQ5NTEwNjczLndlYnA.webp"
      }
      ,
      {
        "id": 2,
        "name": "Pepsi",
        "price": 19.99,
        "description": "This is Product 2",
        "imageUrl": "https://www.yourcoca-cola.co.uk/images?url=https://static.thcdn.com/productimg/original/17736653-1935317350145359.jpg&format=webp&auto=avif&width=1000&height=1000&fit=cover&v=2&dpr=2"
      },
      {
        "id": 3,
        "name": "Coca",
        "price": -5.99,
        "description": "This is Product 3",
        "imageUrl": "https://aquafinawater.vn/library/module_new/san-pham-cua-aquafina_s5874.jpg"
      },
      {
        "id": 4,
        "name": "Lavie",
        "price": -15.99,
        "description": "This is Product 4",
        "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mr2azcx6hq124e"
      }
    ];
  constructor() { }
    getProductsWithImages()
    {
    return this.ProductsImage
    }
    getProductDetail(id:any){
    return this.ProductsImage.find(x=>x.id==id)
    }
}
