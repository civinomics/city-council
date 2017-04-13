import * as functions from 'firebase-functions';
import * as NodeGeocoder from 'node-geocoder';
import * as inside from 'point-in-polygon';
import {FeatureCollection, MultiPolygon} from 'geojson';
import {Request, Response} from 'express';
import {Observable, Observer} from 'rxjs';

export const fxn = (req: Request, res: Response) => {


  console.log(req.url);

  const street = `${req.query['line1'] || ''} ${req.query['line2'] || ''}`,
    city = req.query['city'],
    state = req.query['state'],
    zip = req.query['zip'];

  const groupIds = detectActiveJuridictions(street, city, state, zip);
  //TODO sanitize;
  console.info(`groupIds: ${JSON.stringify(groupIds)}`);
  if (groupIds.length > 0) {

    Observable.forkJoin(...groupIds.map(groupId =>
        Observable.forkJoin(
          loadShapefile(groupId).take(1),
          geocodeAddress(street, city, state, zip).take(1)
        ).map(([shapefile, coords]) => ({groupId, district: findDistrictForCoordinates(shapefile, coords)})
        )
      )
    ).subscribe(userDistricts => {
      console.log(`RESULT for query ${street}, ${city}, ${state}, ${zip}: ${JSON.stringify({userDistricts})}`);
      res.send(JSON.stringify({userDistricts}))
    })

  }
  else {
    res.send({
      userDistricts: []
    })
  }
};

export const districts = functions.https.onRequest(fxn);


function detectActiveJuridictions(street: string, city: string, state: string, zip: string): string[] {
  //TODO
  const INSTANCE_MAPPINGS = [
    {
      test: {
        city: 'austin',
        state: 'tx'
      },
      instance: 'id_acc'
    }
  ];
  return INSTANCE_MAPPINGS.filter(entry => {
    if (entry.test.city && entry.test.state) {
      return (entry.test.city == city.toLowerCase() && entry.test.state == state.toLowerCase())
    }
    return false;
  }).map(entry => entry.instance);
}

function loadShapefile(groupId: string): Observable<FeatureCollection<MultiPolygon>> {
  /*   return Observable.create((observer: Observer<FeatureCollection<MultiPolygon>>) => {
   const ref = app.database().ref(`/group/${groupId}/shapefile`);

   ref.once('value', (result) => {
   observer.next(JSON.parse(result.val()) as FeatureCollection<MultiPolygon>);
   });
   });*/

  return Observable.of(require('../austin.districts.json'));

}

function geocodeAddress(street: string, city: string, state: string, zip: string): Observable<{ lat: number, lon: number }> {

  const geocoder = NodeGeocoder({
    provider: 'google',
    apiKey: functions.config().cc.google_api_key
  });

  console.info(`geocoding ${street}, ${city}, ${state}, ${zip}`);
  return Observable.create((observer: Observer<{ lat: number, lon: number }>) => {
    geocoder.geocode({address: `${street}, ${city}, ${state}`, zipcode: zip}, (err, result) => {
      if (err) {
        console.error(`error geocoding: ${err.message}`);
        observer.error(err);
      }

      if (result.length > 1) {
        console.warn(`More than one result returned: ${JSON.stringify(result)}`);
      }
      result = result[0];

      if (!result.latitude && !result.longitude) {
        observer.error(`Latitude and longitude not present in response: ${JSON.stringify(result)}`);
      }
      console.info(`geocoding result: ${JSON.stringify({lat: result.latitude, lon: result.longitude})}`);
      observer.next({lat: result.latitude, lon: result.longitude});
      observer.complete();
    });
  });
}


function findDistrictForCoordinates(geojson: FeatureCollection<MultiPolygon>, coords: { lat: number, lon: number }) {
  for (let district of geojson.features) {
    for (let multipolygon of district.geometry.coordinates) {
      for (let polygon of multipolygon) {
        if (inside([coords.lon, coords.lat], polygon)) {
          console.log(`FOUND DISTRICT: ${district.properties['council_di'] || district.properties['single_mem']}`);
          return district.properties['council_di'] || district.properties['single_mem'];
        }
      }
    }
  }
}
/*


 /!***** TEST *******!/

 Observable.forkJoin(...['id_acc'].map(groupId =>
 Observable.forkJoin(
 loadShapefile(groupId).take(1),
 geocodeAddress('1920 E Riverside Drive #100', 'Austin', 'TX', '78741').take(1)
 ).map(([shapefile, coords]) => ({groupId, district: findDistrictForCoordinates(shapefile, coords)})
 )
 )
 ).subscribe(userDistricts => {
 console.log(`RESULT: ${JSON.stringify({userDistricts})}`);

 });

 /!***** TEST *******!/
 */
