import { Service } from '@angular/core';

@Service()
export class CatalogService {
    datas=[
        {"Cateid":"cate1","CateName":"nước ngọt","Products":[
            {"ProductId":"p1","ProductName":"Coca","Price":100,"Image":"https://img.onelife.vn/P1nnYV1s4bCxmWvLIrz2g2padPOOvt9TYu14Giko-TI/rs:fit:600:600:1/aHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL3NjX3BjbV9wcm9kdWN0L3Byb2QvMjAyNS8yLzE5LzYxODc5NS04OTM1MDQ5NTEwNjczLndlYnA.webp"},
            {"ProductId":"p2","ProductName":"Pepsi","Price":100,"Image":"https://images.unsplash.com/photo-1629203849820-fdd70d49c38e?auto=format&fit=crop&w=600&q=80"},
            {"ProductId":"p3","ProductName":"Aquafina","Price":100,"Image":"https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=600&q=80"}

        ]},
        {"Cateid":"cate2","CateName":"bia","Products":[
            {"ProductId":"p4","ProductName":"Heineken","Price":200,"Image":"https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=600&q=80"},
            {"ProductId":"p5","ProductName":"Tiger","Price":200,"Image":"https://m.media-amazon.com/images/I/71wYRQUI+wL._AC_UF1000,1000_QL80_.jpg"}
        ]}
        
    ]
    constructor(){ }
    getCategories()
    {
        return this.datas
    }
}
