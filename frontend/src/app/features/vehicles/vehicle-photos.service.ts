import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import { SetVehiclePhotoInput, VehiclePhoto } from './vehicle.model';

const VEHICLE_PHOTO_FIELDS = `
  id
  slotKey
  dataUrl
  vehicleId
`;

const VEHICLE_PHOTOS_QUERY = gql`
  query VehiclePhotos($vehicleId: String!) {
    vehiclePhotos(vehicleId: $vehicleId) {
      ${VEHICLE_PHOTO_FIELDS}
    }
  }
`;

const SET_VEHICLE_PHOTO_MUTATION = gql`
  mutation SetVehiclePhoto($input: SetVehiclePhotoInput!) {
    setVehiclePhoto(input: $input) {
      ${VEHICLE_PHOTO_FIELDS}
    }
  }
`;

const REMOVE_VEHICLE_PHOTO_MUTATION = gql`
  mutation RemoveVehiclePhoto($vehicleId: String!, $slotKey: String!) {
    removeVehiclePhoto(vehicleId: $vehicleId, slotKey: $slotKey)
  }
`;

interface VehiclePhotosQueryResult {
  vehiclePhotos: VehiclePhoto[];
}

@Injectable({ providedIn: 'root' })
export class VehiclePhotosService {
  constructor(private readonly apollo: Apollo) {}

  /// `query()`, no `watchQuery()`: esto se usa con `firstValueFrom` para una
  /// lectura puntual (carga del formulario de edición). `watchQuery().valueChanges`
  /// puede emitir su primer valor antes de que la respuesta de red llegue;
  /// `firstValueFrom` se desuscribe apenas recibe ese primer valor, y esa
  /// desuscripción cancela (`net::ERR_ABORTED`) el fetch real todavía en
  /// vuelo — el resultado es una lista vacía aunque sí haya fotos guardadas.
  /// `query()` es de una sola emisión: no tiene ese problema.
  list(vehicleId: string): Observable<VehiclePhoto[]> {
    return this.apollo
      .query<VehiclePhotosQueryResult>({
        query: VEHICLE_PHOTOS_QUERY,
        variables: { vehicleId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => (result.data?.vehiclePhotos as VehiclePhoto[]) ?? []));
  }

  async set(input: SetVehiclePhotoInput): Promise<VehiclePhoto> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ setVehiclePhoto: VehiclePhoto }>({
        mutation: SET_VEHICLE_PHOTO_MUTATION,
        variables: { input },
      }),
    );
    return result.data!.setVehiclePhoto;
  }

  async remove(vehicleId: string, slotKey: string): Promise<boolean> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ removeVehiclePhoto: boolean }>({
        mutation: REMOVE_VEHICLE_PHOTO_MUTATION,
        variables: { vehicleId, slotKey },
      }),
    );
    return result.data!.removeVehiclePhoto;
  }
}
