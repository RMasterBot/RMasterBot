# RMasterBot
Master of all bots

## Installation
Download repository, then go to directory with your console and do:  
```
npm install
```
Then you can install a bot like this:
```
node install Pinterest  
```
It will donwload files.  
You will be prompt to configure your bot with an application.

*If you want to develop your custom bot you can see the developer section*

## Developer
If you want to develop your custom bot, you have to create thoses directories/files:
* application
    * app.js
    * limit.js
    * api.js
    * log.js
* configurations
    * configuration.js
    * setup.js
* docs
    * api.js
* jobs
    * if you have jobs you can add files here
* models
    * a model for convert json into js classes

If you want to test you can install your bot in RMasterBot with this command:
```
node install http://path.to/the/file.zip  
node install github_account_name/repository_name  
```

You can attach a name for your custom bot like pin for pinterest in bots.json
## Bots
* Pinterest