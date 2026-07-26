import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TareasPageRoutingModule } from './tareas-routing.module';
import { TareasPage } from './tareas.page';
import { Media } from '@awesome-cordova-plugins/media/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { DeviceOrientation } from '@awesome-cordova-plugins/device-orientation/ngx';
import { ComponentsModule } from 'src/app/components/components.module';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TareasPageRoutingModule,
    ComponentsModule
  ],
  declarations: [TareasPage],
  providers: [Media, File, DeviceOrientation, AndroidPermissions]
})
export class TareasPageModule {}
