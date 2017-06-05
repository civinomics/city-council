import { getEmailTransport, initializeAdminApp } from './_internal';
import * as functions from 'firebase-functions';
import { District, GroupCreateInput, RepresentativeCreateInput } from '@civ/city-council';
import { createRandomString } from './utils';


const app = initializeAdminApp();
const db = app.database();
const auth = app.auth();

const cors = require('cors')({ origin: true });

export const createGroup = functions.https.onRequest((request, response) => {

  cors(request, response, () => {

    console.info(`Creating group for input:`);
    console.info(request.body);


    doCreateGroup(request.body as GroupCreateInput).then(groupId => {
      console.info(`Successfully created group ${groupId}`);
      response.status(201).send({
        success: true,
        groupId
      });
    }).catch(error => {
      console.error(`Error creating group: ${JSON.stringify(error)}`);
      console.error(error);
      response.status(500).send({
        success: false,
        error
      });
    })
  });




});


export async function doCreateGroup(groupInput: GroupCreateInput) {

  const groupId = await pushBasicInfo(groupInput.name, groupInput.icon, groupInput.adminId);
  console.info(`pushed basic info - new group id: ${groupId}`);

  const repDataMap = groupInput.representatives.reduce((result, repData) => ({ ...result, [repData.id]: repData }), {});

  console.info(`creating rep user accounts`);
  //create user accounts for each representative,
  const repPushes: Promise<{ inputId: string, outputId: string }[]> =
    Promise.all(
      groupInput.representatives.map(repData => new Promise((resolve, reject) => {
        return createUserAccountForRepresentative(repData, { id: groupId, name: groupInput.name })
            .then(outputId => resolve({ inputId: repData.id, outputId }))
            .catch(err => reject(err))
        })
      )
    );

  const repIdMap: { [inputId: string]: string } = (await repPushes).reduce(
    (result, entry: any) => ({ ...result, [entry.inputId]: entry.outputId }),
    {});

  console.info(`adding rep info to group`);
  //push representative objects (keyed by user id) to group
  await Promise.all(Object.keys(repIdMap)
    .map(inputId => addRepresentativeInfoToGroup(repIdMap[ inputId ], repDataMap[ inputId ], groupId))
  );

  console.info(`creating districts`);
  //create districts, linking to representatives by correct userId
  const districts = await Promise.all(groupInput.districts.map(data => new Promise((resolve, reject) =>
    createDistrict(groupId, data.name, repIdMap[ data.representative ])
      .then(id => resolve({ ...data, id }))
  )));

  //finally, update rep user objects to attach them to their respective districts
  console.info('updating rep user groups');
  await Promise.all(districts.map((district: District) => {
    let repId = repIdMap[ district.representative ];
    return updateRepresentativeGroups(repId, { id: groupId, name: groupInput.name }, {
      id: district.id,
      name: district.name
    })
  }));

  return groupId;
}

async function createDistrict(groupId: string, name: string, representative: string) {
  const result = await db.ref(`/group/${groupId}/districts`).push({
    name,
    representative
  });

  return result.key;
}

async function addRepresentativeInfoToGroup(repId: string, repData: RepresentativeCreateInput, groupId: string) {
  return await db.ref(`/group/${groupId}/representatives`).update({
    [repId]: {
      firstName: repData.firstName,
      lastName: repData.lastName,
      icon: repData.icon,
      email: repData.email,
      title: repData.title
    }
  })
}


async function pushBasicInfo(name: string, icon: string, owner: string): Promise<string> {
  console.info(`pushing basic info: {name: ${name}, icon: ${icon}, owner: ${owner}`);
  const result = await db.ref(`/group`).push({ name, icon, owner });

  return result.key;

}


async function createUserAccountForRepresentative(input: RepresentativeCreateInput,
                                                  group: { id: string, name: string },
                                                  district?: { id: string, name: string }): Promise<string> {

  let password = createRandomString(),
    userId: string;


  try {
    userId = await createAuthAccount(input.email, password);
    console.info('DONE creating auth account');
  } catch (err) {
    console.error('ERROR creating auth account');
    console.error(err);
    throw new Error(`Error creating auth account: ${JSON.stringify(err)}`);
  }

  try {
    await createUserPrivateEntry(userId, input.email);
  } catch (err) {
    console.error('ERROR creating user private entry');
    throw new Error(`Error creating userPrivate entry: ${JSON.stringify(err)}`);
  }
  console.info('DONE creating user private entry');


  try {
    await createUserPublicEntry(userId, input.firstName, input.lastName, input.icon);
    console.info('DONE creating user public entry');

  } catch (err) {
    console.error('ERROR creating user public entry');
    console.error(err);
    throw new Error(`Error creating userPublic entry: ${JSON.stringify(err)}`);
  }
  try {
    await sendRepresentativeEmail('drew@civinomics.com', password, input.firstName, group.name);
    console.info(`DONE sending email to ${input.email}`);
  } catch (err) {
    console.error(`ERROR sending email to ${input.email}`);
    console.error(err);
    /*  if (err){
        throw new Error(`Error sending representative email: ${JSON.stringify(err)}`);
      }*/
  }

  console.info(`DONE creating rep account for ${input.firstName} ${input.lastName}`);
  return userId;

  async function createAuthAccount(email: string, password: string): Promise<string> {
    const result = await auth.createUser({
      email, password, emailVerified: true
    });
    return result.uid;
  }

  async function createUserPrivateEntry(id: string, email: string) {
    return await db.ref(`/user_private/${id}`).set({
      email, isVerified: true
    });
  }

  async function createUserPublicEntry(id: string, firstName: string, lastName: string, icon: string) {
    return await db.ref(`/user/${id}`).set({
      firstName,
      lastName,
      icon
    })
  }

  function sendRepresentativeEmail(email: string, password: string, name: string, groupName: string) {

    const msg = {
      to: email,
      subject: `Your new Civinomics Account`,
      html: `
       <div>
        <p>Greetings, ${name}</p>
        <p>${groupName} has recently begun using Civinomics, and you were listed as a representative. </p> 
        <p>A new account has been created for you - you can sign in <a href="https://civinomics.com/log-in">here</a> using the following credentials: </p>
      </div>g
        <strong>email:</strong> ${email}
        <strong>temporary password: </strong> ${password}
      </div>
      <div>
        <p>
          If you have any questions, don't hesitate to contact us at <a href="mailto:info@civinomics.com">info@civinomics.com</a>
        </p>
        <p>Look forward to seeing you online! </p>
        <p>-Team Civinomics</p>
      </div>
   `
    };

    return new Promise((resolve, reject) => {

      const transport = getEmailTransport();
      transport.sendMail(msg, (err, info) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(info);
        console.log(`sent: ${JSON.stringify(info)}`);
      });

    });

  }

}

async function updateRepresentativeGroups(repId: string, group: { id: string, name: string }, district?: { id: string, name: string }) {
  let obj: any = {
    [group.id]: {
      name: group.name,
      role: 'representative',
      district
    }
  };

  if (district) {
    obj.district = { id: district.id, name: district.name }
  }

  return await db.ref(`/user/${repId}/groups`).update(obj);
}
