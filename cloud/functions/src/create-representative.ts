import { getEmailTransport, initializeAdminApp } from './_internal';
import * as functions from 'firebase-functions';
import { getGroup } from './utils';


export type ResultAdt = {
  success: false;
  error: string
} | {
  success: true;
  userId: string
}

export type InputAdt = {
  email: string, name: string, icon: string; groupId: string, districtId: string
}

const app = initializeAdminApp();
const db = app.database();
const auth = app.auth();
const cors = require('cors')({ origin: true });


export const createRepresentativeAccount = functions.https.onRequest((request, result) => {

  console.info(`Request body: ${JSON.stringify(request.body)}`);

  const input = request.body,
    fields = ['name', 'email', 'icon', 'groupId', 'districtId'],
    emptyFields = fields.filter(key => !input[key]);

  if (emptyFields.length > 0){
    return cors(request, result, () => {
      result.send(400, {
        success: false,
        error:`Missing the following required input fields: ${JSON.stringify(emptyFields)}`
      });
    });
  }

  doCreate(input as InputAdt).then(userId => {
    return cors(request, result, () => {
      result.send(201, {
        success: true,
        userId
      });
    });
  }).catch(error => {
    return cors(request, result, () => {
      result.send(400, {
        success: false,
        error
      });
    });
  })

});


async function doCreate(input: InputAdt){
  let password = createRandomPassword(),
    userId: string;
  try {
    userId = await createAuthAccount(input.email, password);
  } catch (err){
    throw new Error(`Error creating auth account: ${JSON.stringify(err)}`);
  }

  try {
    await createUserPrivateEntry(userId, input.email);
  } catch (err){
    throw new Error(`Error creating userPrivate entry: ${JSON.stringify(err)}`);
  }


  try {
    await createUserPublicEntry(userId, input.name, input.icon);
  } catch (err){
    throw new Error(`Error creating userPublic entry: ${JSON.stringify(err)}`);
  }

  try {
    await updateDistrictRepInfo(input.groupId, input.districtId, userId);
  } catch (err){
    throw new Error(`Error updating district info: ${JSON.stringify(err)}`);
  }


  try {
    await sendRepresentativeEmail(input.email, password, input.name, input.groupId, input.districtId);
  } catch (err){
    throw new Error(`Error sending representative email: ${JSON.stringify(err)}`);
  }


  return userId;
}

function createRandomPassword(){
  let text = "",
      possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_-$";

  for( let i=0; i < 20; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


async function updateDistrictRepInfo(groupId: string, districtId: string, repId: string){
  return await db.ref(`/group/${groupId}/districts/${districtId}`).update({representative: repId})
}

async function createAuthAccount(email: string, password: string): Promise<string> {
  const result = await auth.createUser({
    email, password, emailVerified: true
  });
  return result.uid;
}

async function createUserPrivateEntry(id: string, email: string){
  return await db.ref(`/user_private/${id}`).set({
    email, isVerified: true
  });
}

async function createUserPublicEntry(id: string, name: string, icon: string) {
  return await db.ref(`/user/${id}`).set({
    firstName: name.split(' ')[0],
    lastName: name.split(' ')[1],
    icon
  })
}

async function sendRepresentativeEmail(email: string, password: string, name: string, groupId: string, districtId: string){
  const group = await getGroup(groupId, db);

  const groupName = group.name,
    district = group.districts.filter(it => it.id == districtId)[0],
    districtName = district.name;

  const msg = {
    to: email,
    subject: `Your new Civinomics Account`,
    html: `
       <div>
        <p>Greetings, $\{name}!</p>
        <p>${groupName} has recently begun using Civinomics, and you were listed as the representative for $\{districtName}. </p> 
        <p>A new account has been created for you - you can sign in <a href="https://civinomics.com/sign-in">here</a> using the following credentials: </p>
      </div>
      <div style="text-align: center">
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

  const transport = getEmailTransport();
  return await transport.sendMail(msg);
}
