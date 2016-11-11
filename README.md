# RMasterBot
Master of all bots

## Installation
### NPM
```
npm install rmasterbot
```
Then you can install a bot like this:
```
cd node_modules/rmasterbot
node install Pinterest
```
It will download files.
You will be prompt to configure your bot with an application.

### Standalone
Download repository, then go to directory with your console and do:  
```
npm install
```
Then you can install a bot like this:
```
node install Pinterest  
```
It will download files.
You will be prompt to configure your bot with an application.

*If you want to develop your custom bot you can see the developer section*

## Developer
If you want to develop your custom bot, you have to create thoses directories/files:
* applications
    * main.js
* docs
    * api.js
* jobs
    * if you have jobs you can add files here
* models
    * models for convert json into js classes

You have to add a single file *install.json* placed at the root.
It will contain, bot name, bot folder, configuration setup and additionals packages:
```
{
  "bot_name" : "test",
  "bot_folder" : "test",
  "configuration" : {
    "name":"string",
    "key":"string",
    "secret":"string",
    "access_token":"string",
    "callback_url":"string",
    "scope":"string"
  },
  "packages" : [
    "no-op@1.0.3"
  ]
}
```

If you want to test you can install your bot in RMasterBot with this command:
```
node install http://path.to/the/file.zip  
node install github_account_name/repository_name  
```

You can attach a name for your custom bot like pin for pinterest in bots.json

## Bots Done
* Pinterest

## LICENCE
[LICENCE](../blob/master/LICENSE)