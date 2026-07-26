En el componente donde usemos el modal tendremos que añadir:

declare var bootstrap: any;
declare var window: any;


  showModal() {
    var modal = new window.bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
  }


  closeModal() {
    const modalElement = document.getElementById('confirmModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }


<app-modal
  [title]="'Confirmar eliminación'"
  [message]="'¿Estás seguro de que deseas eliminar este estudio?'"
  [confirmButtonText]="'Eliminar'"
  [cancelButtonText]="'Cancelar'"
  (confirmAction)="confirmDelete()"
  (cancelAction)="closeModal()"
></app-modal>
