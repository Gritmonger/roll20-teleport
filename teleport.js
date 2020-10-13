/* ************ TELEPORTING SCRIPT  **************************
*   The intention of this script is to allow the DM to teleport
*   one or all characters to a location based on a token placed 
*   on the DM layer of the map. 
*     To activate the script, type "!Teleport " and add the name
*   of the teleport location (must not contain spaces) and then 
*   the name of the party member to teleport there. They must be 
*   seperated by commas. If you want all to teleport, type all. 
*   ie. !Teleport teleport01, all - teleports all players to teleport01
*
*   AUTOTELEPORTING: This feature allows you to place a token on 
*   One square (for example stairs) and it will auto move a token 
*   to the linked location and back again should you choose.
*   Linked locations need to be tokens placed on the GMLayer.
*   Naming conventions:
*   Two way doors:   XXXXXXXX2A, XXXXXXXXX2B
*   Three way dooes: XXXXXXXX3A, XXXXXXXXX3B, XXXXXXXXX3C
*       (in the case of one way doors, dont create a 3C)
*   This system can handle up to 9 way doors (9I max).
****************************************************************/

on('ready',() => {
    
    var Teleporter = Teleporter || function(){
        
        // These following three functions parse out and then compare token markers
        // on teleporting tokens and teleportation targets, but only for auto-teleport
        
        const statusmarkersToObject = (stats) => _.reduce(stats.split(/,/), function(memo, value) {
            let parts = value.split(/@/),
            num = parseInt(parts[1] || '0', 10);
    
            if (parts[0].length) {
                memo[parts[0]] = Math.max(num, memo[parts[0]] || 0);
            }
            return memo;
        }, {});
        
        
        var findContains = function(obj,layer){
            "use strict";
            let cx = obj.get('left'),
                cy = obj.get('top');
    
            if(obj) {
                layer = layer || 'gmlayer';
                return _.chain(findObjs({
                        _pageid: obj.get('pageid'),                              
                        _type: "graphic",
                        layer: layer 
                    }))
                    .filter((o)=>/Teleport/.test(o.get('name')))
                    .reduce(function(m,o){
                        let l=o.get('left'),
                            t=o.get('top'),
                            w=o.get('width'),
                            h=o.get('height'),
                            ol=l-(w/2),
                            or=l+(w/2),
                            ot=t-(h/2),
                            ob=t+(h/2);
                            
                        if(    ol <= cx && cx <= or 
                            && ot <= cy && cy <= ob 
                        ){
                            m.push(o);
                            log("Teleporter Name:" + o.get('name'));
                        }
                        return m;
                    },[])
                    .value();
            }
            return [];
         }; 
    
        const CheckLock = (portal, obj) => {
            let objKey=statusmarkersToObject(obj.get('statusmarkers'));
            return _.reduce(statusmarkersToObject(portal.get('statusmarkers')),(m,v,k) => m && _.has(objKey,k) && objKey[k] === v, true);
        };
        
        /*
        The msg based teleporter works slightly differently from the teleporter-intersection script
        It relies on the list of passed tokens to grab and teleport tokens - it right now has no swap to GM layer, but 
        it is hoped to integrate both functions into the same architecture to avoid redundancy, if it is at all possible. 
        Right now: the msg based teleporter needs: 
            - Swap to GM layer for each token DONE
            - Control for single FX generation on "All" DONE
            - Check on all "all" to make sure it is PLAYER or ALL controlled explicitly
                * otherwise this results in all tokens, player and GM controlled as long as they have a sheet, being teleported. DONE
            - Add ping if it is not "ALL", or add GM Ping (default) on any call of "ALL"
            - consider a pass of an fx for fun, maybe not - the way it is done now. (pass attr?)
            - consider audio default for teleport as well.(pass and in destination?)
            - function is inefficient since it performs a MASSIVE search multiple times to move a single token in series. DONE
            - Need to adapt this to digest all of the entries at once - can the findObjs only take a single entry? DONE
        */
        
        var Teleport = function (CharName, TargetName) {
            "use strict";
            var LocX = 0;
            var LocY = 0;
            var LocFX = "";
            var player = (CharName === "all")?Teleporter.DEFAULTPLAYER:"";
            var follow = true;
            var oldColor = "transparent";
            var lastObj = null;
            
            var location = findObjs({
                _pageid: Campaign().get("playerpageid"),                              
                _type: "graphic",
                layer: "gmlayer", //target location MUST be on GM layer
                name: TargetName
            });
            
            if (location.length === 0) {
                sendChat("System", "/w gm No location named " + TargetName + " found. Try checking the spelling and making sure it is on the gm layer.");
                return; //exit if invalid target location
            }
         
            LocX = location[0].get("left");
            LocY = location[0].get("top");
            // Determine if there is any FX associated with the target obj in the gmnotes
            LocFX = unescape(location[0].get('gmnotes')).replace(/<[^>]*>/g,'');
            // If the unescaped content has curly braces, parse as an object, otherwise it's an unescaped string.
            if(LocFX !== '' && LocFX.indexOf("{") !== -1){
                LocFX = JSON.parse(LocFX); 
            }
            
            
            //just get tokens on the objects layer - don't specify name if all.
            if (CharName === "all"){
                var targets = findObjs({
                    _pageid: Campaign().get("playerpageid"),                              
                    _type: "graphic",
                    layer: "objects"
                });
            }
            else
            {
                var targets = findObjs({
                    _pageid: Campaign().get("playerpageid"),                              
                    _type: "graphic",
                    layer: "objects",
                    name: CharName
                });  
            }
            
            
            if(targets.length === 0){
                sendChat("System", "/w gm No character named " + CharName + " found. Please check the spelling, make sure it is on the object layer, and try again.");
                return;
            }
            
            _.each(targets, function(obj) {
                //Only player tokens get moved if the character is "all". 
                if (CharName === "all") {
                    if (obj.get("represents") !== "" && getObj("character", obj.get('represents')).get('controlledby') !== "") {
                        obj.set({layer:'gmlayer'});
                        _.delay(()=>{
                            obj.set({
                                left: LocX + 1,
                                top: LocY,
                                lastmove: ''
                            });
                            _.delay(()=>{
                                obj.set({
                                layer: 'objects'
                                });
                            },500);
                        },100);
                    }
                } 
                else {
                    

                    let character=(obj.get('represents'))?getObj("character", obj.get('represents')):null;
                    
                    let controller = (character)?character.get('controlledby'):'';
                    if(controller !== '' && controller !== 'all' ){
                        player=getObj("player", controller);
                        follow=true;
                    }else{
                        // set player to GM (eventually), and if not "all" set follow to false
                        player=Teleporter.DEFAULTPLAYER;
                        follow=(controller === 'all')?true:false;
                    }
                    
                    if((!Teleporter.AUTOPINGMOVE && follow) || !follow){
                        follow=false;
                    }else{
                        oldColor=player.get("color");
                        if (Teleporter.HIDEPINGFX){player.set({color:"transparent"});}
                    }
                    
                    
                    obj.set({layer:'gmlayer'});
                    _.delay(()=>{
                        obj.set({
                            left: LocX + 1,
                            top: LocY,
                            lastmove: ''
                        });
                        _.delay(()=>{
                            obj.set({
                            layer: 'objects'
                            });
                            if(LocFX !== '' && Teleporter.AUTOPLAYFX ){
                                if(_.isString(LocFX)){
                                    spawnFx(LocX, LocY, LocFX, obj.get('pageid'));
                                }else{
                                    spawnFxWithDefinition(LocX, LocY, LocFX, obj.get('pageid'));
                                }
                            }
                            
                            if(follow){sendPing(LocX, LocY, obj.get('pageid'), player.get("_id"), true, player.get("_id"));}
                            
                            _.delay(()=>{
                                // Longer delay to re-set the player color to allow the ping to finish.
                                if(follow){player.set({color: oldColor});}
                            },1000);
                        },500);
                    },100);
                }
                lastObj = obj;
            });
            
            if (CharName === "all"){
                
                if(!Teleporter.AUTOPINGMOVE){
                    follow=false;
                }else{
                    follow=true;
                    oldColor=player.get("color");
                    if (Teleporter.HIDEPINGFX){player.set({color:"transparent"});}
                }
                /**/
                _.delay(()=>{
                    if(LocFX !== '' && Teleporter.AUTOPLAYFX ){
                        if(_.isString(LocFX)){
                            spawnFx(LocX, LocY, LocFX, Campaign().get("playerpageid"));
                        }else{
                            spawnFxWithDefinition(LocX, LocY, LocFX, Campaign().get("playerpageid"));
                        }
                    }
                    
                    if(follow){sendPing(LocX, LocY, lastObj.get('pageid'), player.get("_id"), true, player.get("_id"));}
                    
                    _.delay(()=>{
                // Longer delay to re-set the player color to allow the ping to finish.
                        if(follow){player.set({color: oldColor});}
                    },1000);
               },500);
            }
        };
        
        
        on("change:graphic", function(obj) {
            "use strict";
    
            if (obj.get("name").indexOf("Teleport") !== -1 || /(walls|map)/.test(obj.get('layer'))) {
                return; //Do not teleport teleport pads!!
            }
            if (Teleporter.AUTOTELEPORTER === false) {
                return; //Exit if auto Teleport is disabled
            }
            /*  To use this system, you need to name two Teleportation locations the same
            *   with only an A and B distinction. For instance Teleport01A and Teleport01B 
            *   will be linked together. When a token gets on one location, it will be
            *   Teleported to the other automatically */
            
            //Finds the current teleportation location
            var CurrName = "";
            
            var location = findContains(obj,'gmlayer');
            if (location.length === 0) {
                return;
            }
    
            
            let Curr = location[0];
    
            if(!CheckLock(Curr,obj)){
                return;
            }

            
            CurrName = Curr.get("name");
    
            
            var Letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
            
            //Number of doors in the cycle (second to last character)
            var doorCount = CurrName.substr(CurrName.length - 2, 1);
            
            //Current Letter of the Door
            var currDoor = CurrName.substr(CurrName.length - 1, 1);
            //Finds the pair location and moves target to that location
            
            var i = 0;
            
            if( CurrName.match(/^R:/) ) {
                i = randomInteger(doorCount)-1;
            } else {
                i = Letters.indexOf(currDoor);
                
                if (i === doorCount - 1) {
                    i = 0;
                }
                else {
                    i = i + 1;
                }
            }
            
            var NewName = CurrName.substr(0,CurrName.length - 2) + doorCount + Letters[i];
            
            var NewX = 0;
            var NewY = 0;
            var LocFX = "";
            
            var newLocation = findObjs({
                _pageid: obj.get('pageid'),
                _type: "graphic",
                layer: "gmlayer", //target location MUST be on GM layer
                name: NewName
            });
    
            _.each(newLocation, function(Loc){
                    //Get the new Location
                NewX = Loc.get("left");
                NewY = Loc.get("top");
                LocFX = unescape(Loc.get('gmnotes')).replace(/<[^>]*>/g,'');
            });
            
            if (NewX === 0 ) {
                return;
            }
            
            
            if(LocFX !== '' && LocFX.indexOf("{") !== -1){
                LocFX = JSON.parse(LocFX); // convert LocFX to an object
            }
            let currLayer=obj.get('layer');
            let character=(obj.get('represents'))?getObj("character", obj.get('represents')):null;
            let player, follow, oldColor; 
            var controller = (character)?character.get('controlledby'):'';
            if(controller !== '' && controller !== 'all' ){
                player=getObj("player", controller);
                follow=true;
            }else{
                // set player to GM (eventually), and if not "all" set follow to false
                player=Teleporter.DEFAULTPLAYER;
                follow=(controller === 'all')?true:false;
            }
    
            // use override for send ping
            if((!Teleporter.AUTOPINGMOVE && follow) || !follow){
                follow=false;
            }else{
                oldColor=player.get("color");
                if (Teleporter.HIDEPINGFX){player.set({color:"transparent"});}
            }
            
           
            obj.set({
                layer: 'gmlayer'
            });
            _.delay(()=>{
                obj.set({
                    left: NewX,
                    top: NewY,
                    lastmove: ''
                });
                _.delay(()=>{
                    obj.set({
                        layer: currLayer
                    });
                    // Ping only the specified player to this location - (get controlling player, have to account for multiple/"all")
                    if(follow){sendPing(NewX, NewY, obj.get('pageid'), player.get("_id"), true, player.get("_id"));}
                    if(LocFX !== '' && Teleporter.AUTOPLAYFX ){
                        if(_.isString(LocFX)){
                            spawnFx(NewX, NewY, LocFX, obj.get('pageid'));
                        }else{
                            spawnFxWithDefinition(NewX, NewY, LocFX, obj.get('pageid'));
                        }
                    }
                    _.delay(()=>{
                        // Longer delay to re-set the player color to allow the ping to finish.
                        if(follow){player.set({color: oldColor});}
                    },1000);
                },500);
            },100);
        });
        
        
        
        
        on("chat:message", function(msg) {   
            "use strict";
            var cmdName = "!Teleport ";
            if (msg.type === "api" && msg.content.indexOf(cmdName) !== -1 && playerIsGM(msg.playerid)) {
                var cleanedMsg = msg.content.replace(cmdName, "");
                var commands = cleanedMsg.split(", ");
                var targetName = commands[0];
         
                var i = 1;
                // Fires off one command for each entry - meaning multiple SFX and refocus etc. unless ALL
                while ( i < commands.length ) {
                    Teleporter.Teleport(commands[i], targetName);
                    i = i + 1;
                }
            }
            if (msg.content.indexOf("!AUTOTELEPORTER") !== -1 && playerIsGM(msg.playerid)) {
         
                if ( Teleporter.AUTOTELEPORTER === true) {
                    sendChat("System", "/w gm Autoteleporting Disabled.");
                    Teleporter.AUTOTELEPORTER = false;
                }
                else {
                    sendChat("System", "/w gm Autoteleporting Enabled.");
                    Teleporter.AUTOTELEPORTER = true;
                }
            }
            
            if (msg.content.indexOf("!AUTOPINGMOVE") !== -1 && playerIsGM(msg.playerid)) {
         
                if ( Teleporter.AUTOPINGMOVE === true) {
                    sendChat("System", "/w gm Ping-move Disabled.");
                    Teleporter.AUTOPINGMOVE = false;
                }
                else {
                    sendChat("System", "/w gm Ping-move Enabled.");
                    Teleporter.AUTOPINGMOVE = true;
                }
            }
            
            if (msg.content.indexOf("!AUTOPLAYFX") !== -1 && playerIsGM(msg.playerid)) {
         
                if ( Teleporter.AUTOPLAYFX === true) {
                    sendChat("System", "/w gm Auto Play FX Disabled.");
                    Teleporter.AUTOPLAYFX = false;
                }
                else {
                    sendChat("System", "/w gm Auto Play FX Enabled.");
                    Teleporter.AUTOPLAYFX = true;
                }
            }
            if (msg.content.indexOf("!HIDEPINGFX") !== -1 && playerIsGM(msg.playerid)) {
         
                if ( Teleporter.HIDEPINGFX === true) {
                    sendChat("System", "/w gm Hide Ping FX Disabled.");
                    Teleporter.HIDEPINGFX = false;
                }
                else {
                    sendChat("System", "/w gm Hide Ping FX Enabled.");
                    Teleporter.HIDEPINGFX = true;
                }
            }
        }); 
        
        return {
            AUTOTELEPORTER: true,   // Set to true if you want teleports to be linked
            AUTOPINGMOVE: true,     // Set to true if you want individual auto-teleports/teleports to also move the view.
            AUTOPLAYFX: true,       // Set to true if you want FX to play for teleport targets. 
                                    //   - Still checks for FX before playing. False turns all off.
            HIDEPINGFX: true,         // Set to true if you want the ping FX to be hidden, turn false for visible ping FX
                                    // Run this onece to get a player object for the GM for "default" pings for "all" 
            DEFAULTPLAYER:  (function(){
                                let player;
                                let playerlist = findObjs({                              
                                      _type: "player",                          
                                });
                                _.each(playerlist, function(obj) {    
                                  if(playerIsGM(obj.get("_id"))){
                                      player = obj;
                                  };
                                });
                                return player;
                            })(),
            Teleport: Teleport
        }
        
    }();
    

});
