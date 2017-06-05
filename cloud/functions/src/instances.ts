export type InstanceData = {
  groupId: string,
  adminId: string,
  canEditIds: string[],
  shapefilePath: string,
  restEndpoint: {
    host: string,
    path: string,
    method: 'GET'
  },
  pullMeetingTypes: string[],
  meetingTypeDisplayNames: { [type: string]: string },
  closeFeedback: number,
  meetingLength: number,
  timeZone: string
} & (
  {
    hasDistricts: true,
    districtFeatureKeys: string[],
    districtFeatureValues: { [key: string]: string },
  } | { hasDistricts: false }
  )


const INSTANCES: { [id: string]: InstanceData } = {
  id_acc: { //this will ultimately be persisted and loaded for the relavant group
    groupId: 'id_acc',
    adminId: 'id_doug',
    canEditIds: [ 'id_doug' ],

    shapefilePath: 'id_acc.geojson',
    hasDistricts: true,
    districtFeatureKeys: [ 'council_di', 'single_mem' ],
    districtFeatureValues: {
      '1': 'id_district_101',
      '2': 'id_district_102',
      '3': 'id_district_103',
      '4': 'id_district_104',
      '5': 'id_district_105',
      '6': 'id_district_106',
      '7': 'id_district_107',
      '8': 'id_district_108',
      '9': 'id_district_109',
      '10': 'id_district_110',
    },
    restEndpoint: {
      host: 'data.austintexas.gov',
      path: '/resource/es7e-878h.json',
      method: 'GET'
    },
    pullMeetingTypes: [ 'Austin City Council' ],
    meetingTypeDisplayNames: {
      'Austin City Council': 'Regular Meeting of the Austin City Council'
    },
    closeFeedback: 1440, //number of minutes before meeting to close feedback (1440 = 24 * 60)
    meetingLength: 120, //number of minutes after start that meeting ends
    timeZone: '+06:00'
  },
  scc: {
    groupId: 'scc',
    adminId: 'id_scc_admin',
    canEditIds: [ 'id_scc_admin' ],

    shapefilePath: 'santa-cruz-county.geojson',
    hasDistricts: true,
    districtFeatureKeys: [ 'Super_Dist' ],

    districtFeatureValues: {
      'SUPER-1': '-Klp-2Wm7uWKWu4lu5bc',
      'SUPER-2': '-Klp-2Wn-l4V12uHg1Sn',
      'SUPER-3': '-Klp-2Wokb6QxVPYYfBJ',
      'SUPER-4': '-Klp-2WpnORbvVz8ZFnZ',
      'SUPER-5': '-Klp-2Wq9wZekT3BuRrr',
    },


    restEndpoint: {
      host: 'TODO',
      path: 'TODO',
      method: 'GET'
    },
    pullMeetingTypes: [],
    meetingTypeDisplayNames: {},
    closeFeedback: 1440, //number of minutes before meeting to close feedback (1440 = 24 * 60)
    meetingLength: 120, //number of minutes after start that meeting ends
    timeZone: '+06:00'

  },
  sqcwd: {
    groupId: 'sqcwd',
    adminId: 'id_sqcwd_admin',
    canEditIds: [ 'id_sqcwd_admin' ],

    shapefilePath: 'sqcwd.geojson',
    hasDistricts: false,

    restEndpoint: {
      host: 'TODO',
      path: 'TODO',
      method: 'GET'
    },
    pullMeetingTypes: [],
    meetingTypeDisplayNames: {},
    closeFeedback: 1440, //number of minutes before meeting to close feedback (1440 = 24 * 60)
    meetingLength: 120, //number of minutes after start that meeting ends
    timeZone: '+06:00'
  }
};

export function getInstance(id: string): InstanceData {
  if (!INSTANCES[ id ]) {
    throw new Error(`No instance data exists for id ${id}`);
  }
  return INSTANCES[ id ]
}

export function getAllInstances(): InstanceData[] {
  return Object.keys(INSTANCES).map(id => INSTANCES[ id ]);
}
