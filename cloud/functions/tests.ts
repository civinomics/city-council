/*


 const app = initializeAdminApp();
 const database = app.database();
 */

/*getFollowersWithEmailAddresses('group', 'id_acc', database).then(it => {
 console.log(it);
 })*/

/*computeMeetingStats('id_meeting_511').then(it => {
  fs.writeFileSync('dev-stats2.json', JSON.stringify(it));
  console.log('done');
 });*/

/*
 getOrComputeMeetingStats('-KjZWYD7GevirhrxSmF2').then(it => {
 fs.writeFileSync('dev-stats2.json', JSON.stringify(it));
 console.log('done');
 });
 */

/*

 doImport( { //this will ultimately be persisted and loaded for the relavant group
 groupId: 'id_acc',
 adminId: 'id_doug',
 canEditIds: [ 'id_doug' ],
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
 }).then(()=> {
 console.log('success');
 });
 */
