import { Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable } from '@angular/material/table';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AgregarProductoDialogComponent } from 'src/app/gestion/get-productos-array-dialog/agregar-producto.component';
import { MSJ_ERROR_COMM_SRV, REACTIVE_FORMS_ISOLATE, VENTA_TIPO_BOLETA, VENTA_TIPO_FACTURA } from 'src/app/shared/constantes';
import { crearDetalleVentaDesdeProducto } from 'src/app/shared/funciones';
import { CompositeEntityDataService } from 'src/data/composite-entity.data.iservice';
import { EntityDataService } from 'src/data/entity.data.iservice';
import { SERVICE_ALIASES } from 'src/data/service-aliases';
import { Cliente } from 'src/models/Cliente';
import { DetalleVenta } from 'src/models/DetalleVenta';
import { Empleado } from 'src/models/Empleado';
import { Producto } from 'src/models/Producto';
import { Venta } from 'src/models/Venta';
import { AuthService } from 'src/services/auth.service';

export interface VentaFormDialogGestionData {
  venta: Venta;
}

export interface TipoVenta {
  codigo: string;
  descripcion: string;
}

export const TIPOS_VENTA: TipoVenta[] = [
  { codigo: VENTA_TIPO_BOLETA, descripcion: 'Boleta' },
  { codigo: VENTA_TIPO_FACTURA, descripcion: 'Factura' }
];

@Component({
  selector: 'app-venta-form-dialog-gestion',
  templateUrl: './venta-form-dialog.component.html',
  styleUrls: [
    '../../../../assets/styles/formularios.css',
    './venta-form-dialog.component.css'
  ]
})
export class VentaFormDialogGestionComponent
  implements OnInit {

  protected idVenta: number;
  protected detallesVenta: DetalleVenta[];
  protected detallesVentaSource: BehaviorSubject<DetalleVenta[]>;
  protected subtotalVentaSource: BehaviorSubject<number>;
  protected totalVentaSource: BehaviorSubject<number>;

  public get tipos(): TipoVenta[] { return TIPOS_VENTA; }
  public empleados$: Observable<Empleado[]>;
  public clientes$: Observable<Cliente[]>;

  public cargando: boolean;
  public guardando: boolean;

  public ventaForm: FormGroup;

  @ViewChild('tablaDetalles', { static: true }) public tablaDetalles: MatTable<DetalleVenta>;
  public columnasTabla: string[];

  public fechaVenta: string;
  public detallesVenta$: Observable<DetalleVenta[]>;
  public subtotalVenta$: Observable<number>;
  public totalVenta$: Observable<number>;


  constructor(
    @Inject(MAT_DIALOG_DATA) protected dialogData: VentaFormDialogGestionData,
    protected self: MatDialogRef<VentaFormDialogGestionComponent>,
    protected snackBar: MatSnackBar,
    protected fb: FormBuilder,
    @Inject(SERVICE_ALIASES.sales) protected httpSvc: CompositeEntityDataService<Venta, DetalleVenta>,
    @Inject(SERVICE_ALIASES.clients) protected clHttpSvc: EntityDataService<Cliente>,
    protected authSvc: AuthService,
    protected dialog: MatDialog,
    @Inject(SERVICE_ALIASES.employees) protected empHttpSvc: EntityDataService<Empleado>
  ) {
    this.cargando = true;
    this.guardando = true;
    this.detallesVenta = [];
    this.detallesVentaSource = new BehaviorSubject([]);
    this.subtotalVentaSource = new BehaviorSubject(0);
    this.totalVentaSource = new BehaviorSubject(0);

    this.fechaVenta = (new Date()).toLocaleDateString();
    this.detallesVenta$ = this.detallesVentaSource.asObservable();
    this.subtotalVenta$ = this.subtotalVentaSource.asObservable();
    this.totalVenta$ = this.totalVentaSource.asObservable();
    this.columnasTabla = [ 'producto', 'precio', 'cantidad', 'acciones' ];

    this.ventaForm = this.fb.group({
      tipo: [null, Validators.required],
      empleado: [null],
      cliente: [null, Validators.required]
    });


    if (this.dialogData && this.dialogData.venta) {
      const vnt: Venta = this.dialogData.venta;
      this.cargarVenta(vnt);
    } else {
      this.empleado.setValue(this.authSvc.sesion.idEmpleado);
      this.cargando = false;
    }
  }

  public get tipo() { return this.ventaForm.get('tipo'); }
  public get empleado() { return this.ventaForm.get('empleado'); }
  public get cliente() { return this.ventaForm.get('cliente'); }

  public get esNueva() { return isNaN(this.idVenta); }

  ngOnInit() {
    this.clientes$ = this.clHttpSvc.readAll();
    this.empleados$ = this.empHttpSvc.readAll();
  }

  protected cargarVenta(vnt: Venta): void {

    this.ventaForm.disable(REACTIVE_FORMS_ISOLATE);
    this.cargando = true;

    this.idVenta = vnt.idVenta;

    this.tipo.setValue(vnt.tipoVenta, REACTIVE_FORMS_ISOLATE);
    this.cliente.setValue(vnt.idCliente, REACTIVE_FORMS_ISOLATE);

    if (vnt.idEmpleado) {
      this.empleado.setValue(vnt.idEmpleado, REACTIVE_FORMS_ISOLATE);
    }

    this.fechaVenta = vnt.fechaVenta;

    this.httpSvc.readDetailsById(vnt.idVenta).pipe(
      finalize(() => {
        this.cargando = false;
        this.ventaForm.enable();
      })
    ).subscribe(
      (detalles: DetalleVenta[]) => {
        this.actualizarDetalles(detalles);
      },
      err => {
        this.snackBar.open(MSJ_ERROR_COMM_SRV, 'OK', { duration: -1 });
      }
    );
  }

  protected actualizarResumen() {

    let subtotalAux = 0;
    for (const item of this.detallesVenta) {
      if (item.precioProducto && item.unidadesProducto) {
        const unidades = item.unidadesProducto;

        const detalleValor = item.precioProducto * unidades;
        subtotalAux += detalleValor;
      }
    }

    const totalAux = Math.trunc(subtotalAux * 1.19);

    this.subtotalVentaSource.next(subtotalAux);
    this.totalVentaSource.next(totalAux);
  }

  protected actualizarDetalles(detalles: DetalleVenta[]) {
    this.detallesVenta = detalles;
    this.actualizarResumen();
    this.detallesVentaSource.next(detalles);
  }

  protected guardarVenta(vt: Venta): void {
    this.ventaForm.disable(REACTIVE_FORMS_ISOLATE);
    this.cargando = true;

    this.httpSvc.create(vt).subscribe(
      (vt2: Venta) => {
        // TODO: make sure vt2 is not actually vt
        if (vt2.idVenta) {
          if (vt.idVenta) {
            this.snackBar.open('Venta N° \'' + vt.idVenta + '\' actualizada exitosamente.');
          } else {
            this.snackBar.open('Venta N° \'' + vt2.idVenta + '\' registrada exitosamente.');
          }
          this.self.close(vt2);
        } else {
          this.snackBar.open(MSJ_ERROR_COMM_SRV, 'OK', { duration: -1 });
          this.ventaForm.enable(REACTIVE_FORMS_ISOLATE);
          this.guardando = false;
        }
      }, err => {
        this.snackBar.open(MSJ_ERROR_COMM_SRV, 'OK', { duration: -1 });
        this.ventaForm.enable(REACTIVE_FORMS_ISOLATE);
        this.guardando = false;
      }
    );
  }

  public onClickAgregarProductos(): void {
    const dg = this.dialog.open(AgregarProductoDialogComponent, {
      width: '70rem'
    });

    dg.afterClosed().subscribe(
        (productos: Producto[]) => {
          if (productos && productos.length > 0) {

            const nuevosDetalles = productos.map(
              (prod: Producto) => {
                return crearDetalleVentaDesdeProducto(prod);
              }
            );
            this.detallesVenta.push(...nuevosDetalles);
            this.actualizarResumen();
            this.detallesVentaSource.next(this.detallesVenta);
          }
        }
      );
  }

  public onClickIncrementarCantidadProductoDetalle(index: number): void {
    const detalle: DetalleVenta = this.detallesVenta[index];
    if (detalle) {
      detalle.unidadesProducto++;
      this.actualizarResumen();
      this.detallesVentaSource.next(this.detallesVenta);
    }
  }

  public onClickReducirCantidadProductoDetalle(index: number): void {
    const detalle: DetalleVenta = this.detallesVenta[index];
    if (detalle) {
      detalle.unidadesProducto--;
      this.actualizarResumen();
      this.detallesVentaSource.next(this.detallesVenta);
    }
  }

  public onClickBorrarDetalle(index: number) {
    this.detallesVenta.splice(index, 1);
    this.actualizarResumen();
    this.detallesVentaSource.next(this.detallesVenta);
  }

  public onClickAceptar(): void {
    const nuevo: Venta = {
      idVenta: this.idVenta ? this.idVenta : null,
      tipoVenta: this.tipo.value,
      fechaVenta: this.fechaVenta ? this.fechaVenta : null,
      idCliente: this.cliente.value,
      idEmpleado: this.empleado.value,
      detallesVenta: this.detallesVenta,
      subtotalVenta: null
    };

    this.guardarVenta(nuevo);
  }

  public onClickCancelar(): void {
    this.self.close();
  }

  @Input() public set Venta(vnt: Venta) {
    if (vnt) {
      this.cargarVenta(vnt);
    } else {
      this.ventaForm.reset();
    }
  }

}