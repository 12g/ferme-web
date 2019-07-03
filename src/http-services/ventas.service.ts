import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RootHttpService } from 'src/http-services/root.service';
import { Venta } from 'src/modelo/Venta';
import { DetalleVenta } from 'src/modelo/DetalleVenta';

@Injectable({
  providedIn: 'root'
})
export class VentasHttpService extends RootHttpService {

  protected baseURI = this.baseURI + "/gestion/ventas";

  constructor(
    protected http: HttpClient
  ) {
    super();
  }

  public listarVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.baseURI);
  }

  public listarDetalles(venta: Venta): Observable<DetalleVenta[]> {
    return this.http.post<DetalleVenta[]>(this.baseURI + "/detalles", venta);
  }

  public guardarVenta(prod: Venta): Observable<number> {
    return this.http.post<number>(this.baseURI + "/guardar", prod);
  }

  public borrarVenta(idVenta: number): Observable<boolean> {
    return this.http.post<boolean>(this.baseURI + "/borrar", idVenta);
  }
}
