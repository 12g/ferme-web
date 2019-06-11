import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FERME_GESTION_ROUTES } from './gestion.routes';
    
export interface NavegadorModuloItem {
  path: string;
  texto: string;
  icono: string;
}

export const MODULOS_ICONOS = {
  clientes: "person",
  empleados: "work",
  productos: "layers",
  proveedores: "rv_hookup",
  ventas: "attach_money"
}

@Component({
  selector: 'app-gestion',
  templateUrl: './gestion.component.html',
  styleUrls: ['./gestion.component.css']
})
export class GestionNavegadorComponent implements OnInit, OnDestroy {

  public modulos: NavegadorModuloItem[];

  private _routerParamsSub: Subscription;

  constructor(
    // private router: Router,
    // private route: ActivatedRoute
  ) { 
    // this.routerParamsSub = this.route.params.subscribe((params) => {
    //   console.log(this.route);
    // });
  }

  ngOnInit() {
    this.modulos = this.generarListadoModulos();
  }

  ngOnDestroy() {
    if (this._routerParamsSub) {
      this._routerParamsSub.unsubscribe();
    }
  }

  private generarListadoModulos() {
    let protoModulos: NavegadorModuloItem[] = FERME_GESTION_ROUTES.map((route) => {
      const protoModulo: NavegadorModuloItem = {
        path: route.path,
        texto: this.routePathToText(route.path),
        icono: MODULOS_ICONOS[route.path]
      };
      return protoModulo;
    });

    protoModulos.forEach((route) => {
      route.texto = this.routePathToText(route.path);
    });
    return protoModulos;
  }

  /**
   * Separa el string por guiones bajos, deja la primera letra de cada palabra separada en mayúscula, y las vuelve a unir con espacios.
   * @param path 
   */
  public routePathToText(path: string): string {
    return path.split("_").map((palabra) => { return palabra.charAt(0).toUpperCase()+palabra.substring(1); }).join(" ");
  }

}
