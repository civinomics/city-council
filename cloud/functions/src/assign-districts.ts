import * as functions from 'firebase-functions';
import { Event } from 'firebase-functions';
import * as NodeGeocoder from 'node-geocoder';
import { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { getAllInstances } from './instances';
import * as fs from 'fs';
import { DeltaSnapshot } from 'firebase-functions/lib/providers/database';
import { initializeAdminApp } from './_internal';
import { UserAddress } from '@civ/city-council';
import { getGroup, getUser } from './utils';
import * as d3 from 'd3';

const cors = require('cors')({ origin: true });


const app = initializeAdminApp();
const db = app.database();


export const assignDistricts = functions.database.ref(`/user_private`).onWrite((event: Event<DeltaSnapshot>) => {
  console.info(`user_private write event: checking for address changes`);
  let changes = findChangedAddresses(event.data);

  if (Object.keys(changes).length == 0) {
    console.info(`No address changes found, returning`);
    return;
  } else {
    const userIds = Object.keys(changes);
    console.info(`Found ${userIds.length} changed addresses - updating groups`);
    userIds.forEach(userId => {
      console.info(`updating groups for user ${userId} | address: ${changes[ userId ].line1}, ${changes[ userId ].line2}, ${changes[ userId ].city}, ${changes[ userId ].state}, ${changes[ userId ].zip} `);
      updateUserGroups(userId, changes[ userId ]).then(result => {
        console.info(`successfully updated groups for user ${userId}:`);
        console.info(result)
      }).catch(err => {
        console.error(`Error updating groups for user ${userId}`);
        console.error(err);
      })
    });
  }


});

export async function updateUserGroups(userId: string, address: UserAddress) {

  const street = `${address.line1} ${address.line2 || ''}`;
  console.info(`with || :: ${address.line1} ${address.line2 || ''}`);
  console.info(`without || :: ${address.line1} ${address.line2}`);


  const groups = await getGroupsForAddress(street, address.city, address.state, address.zip);

  await updateUserRecord(userId, groups);

  return groups;
}

export async function getGroupsForAddress(street: string, city: string, state: string, zip: string) {
  const instances = getAllInstances();
  const coords = await geocodeAddress(street, city, state, zip);

  const groups: any = {};

  for (let i = 0; i < instances.length; i++) {
    const instance = instances[ i ];
    const shapefile = await loadShapefile(instance.shapefilePath);

    if (instance.hasDistricts == true) {
      const districtKey = findDistrictForCoordinates(shapefile as FeatureCollection<MultiPolygon>, coords, instance.districtFeatureKeys);
      if (districtKey) {
        let civDistrictId = instance.districtFeatureValues[ districtKey as string ];
        groups[ instance.groupId ] = civDistrictId
      }
    } else {
      if (containsCoordinates(shapefile, coords)) {
        groups[ instance.groupId ] = null;
      }
    }


  }

  return groups;

}

async function updateUserRecord(userId: string, groups: { [groupId: string]: string | null }) {
  const currVal = (await getUser(userId, db)).groups;
  const it = {};

  const groupIds = Object.keys(groups);

  for (let i = 0; i < groupIds.length; i++) {
    const groupId = groupIds[ i ];
    const group = await getGroup(groupId, db);

    const currRole = currVal[ groupId ] && currVal[ groupId ].role || undefined;

    const entry: any = {
      name: group.name,
      role: currRole || 'citizen' // don't override rep or admin values here
    };

    if (groups[ groupId ] != null) {
      const districtId = groups[ groupId ];
      const matching: any = group.districts.filter(it => it.id == districtId);

      if (matching.length !== 1) {
        throw new Error(`expected exactly one district to match id ${districtId} but found ${JSON.stringify(matching)}`);
      }
      const district = matching[ 0 ];

      entry.district = {
        id: districtId,
        name: district.name
      }
    }

    it[ groupId ] = entry;
  }


  return db.ref(`/user/${userId}/groups`).set(it);

}


function loadShapefile(path: string): FeatureCollection<MultiPolygon> {
  const file = fs.readFileSync(`./shapefiles/${path}`,);
  return JSON.parse(file.toString()) as FeatureCollection<MultiPolygon>;
}

async function geocodeAddress(street: string, city: string, state: string, zip: string): Promise<{ lat: number, lon: number }> {

  const geocoder = NodeGeocoder({
    provider: 'google',
    apiKey: functions.config().cc.google_api_key
  });

  let result: any;


  try {
    result = await geocoder.geocode({ address: `${street}, ${city}, ${state}`, zipcode: zip });
  } catch (err) {
    console.error(`Error geocoding address ${street}, ${city}, ${state}`);
    throw err;
  }

  if (result.length > 1) {
    console.warn(`More than one result returned for query ${street}, ${city}, ${state}: ${JSON.stringify(result)}`);
  }

  result = result[ 0 ];

  if (!(result.latitude && result.longitude)) {
    throw new Error(`Latitude and longitude not present in response: ${JSON.stringify(result)}`);
  }
  console.info(`geocoding result: ${JSON.stringify({ lat: result.latitude, lon: result.longitude })}`);

  return { lat: result.latitude, lon: result.longitude };
}

function containsCoordinates(object: FeatureCollection<MultiPolygon | Polygon>, coords: { lat: number, lon: number }) {
  return d3.geoContains(object, [ coords.lon, coords.lat ]);
}

function findDistrictForCoordinates(geojson: any, coords: { lat: number, lon: number }, keys?: string[]): string | boolean {
  let point = [ coords.lon, coords.lat ] as [ number, number ];

  if (!d3.geoContains(geojson, point)) {
    return false;
  }

  for (let feature of geojson.features) {
    if (d3.geoContains(feature, point)) { //can be polygon or multipolygon
      if (keys && keys.length > 0) {
        for (let key of keys) {
          if (feature.properties[ key ]) {
            return feature.properties[ key ];
          }
        }
        throw new Error(`could not find any of the expected keys.`)
      } else {
        return true;
      }
    }
  }


}


function findChangedAddresses(delta: DeltaSnapshot): { [id: string]: UserAddress } {
  let returnVal = {};
  delta.forEach(user => {
    if (user.child('address').changed()) {
      let addr: UserAddress = user.child('address').val();
      returnVal[ user.key ] = addr;
    }
    return false;
  });
  return returnVal;
}

