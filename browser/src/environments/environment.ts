// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyBSfj3nkcMd2gKr3leV70-atj1Ln-lKCIU',
    authDomain: 'civ-cc.firebaseapp.com',
    databaseURL: 'https://civ-cc.firebaseio.com',
    storageBucket: 'civ-cc.appspot.com',
    messagingSenderId: '950386376197'
  },
  google: {
    apiKey: "AIzaSyAXuMc0xYdOErceFEztUqneoO78G9tToww"
  }
};
