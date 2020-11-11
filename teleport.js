    var Teleport = Teleport || (function(){
        /*
            Teleport is a script designed to make a few things easier: 
                - multi-storey buildings
                - building interiors
                - magical teleportation
                - falling traps and hazards
                - pings to drag player attention without ping-rings
                - spawning special effects at locations with pings
                - causing GM layer creatures to appear with pings and effects
                - anything else you can think of for the tools this provides. 
        */
        var version = '0.9 Alpha Release',
            author = 'Gritmonger',
            lastModified = 1604783535334
        // DEFAULTPLAYER is used for pings where a controlled by lists "all"
        // and for other situations where a GM might want to ping all. 
        state.teleport = state.teleport || {};
        state.teleport.config = state.teleport.config || {};
        state.teleport.increment = state.teleport.increment || 0;
        var getStateParam = function(param,deflt){
            if(typeof state.teleport.config[param] !== 'null' && typeof state.teleport.config[param] !== 'undefined'){
                return state.teleport.config[param];
            }else{
                return setStateParam(param,deflt);
            }
        },
        setStateParam = function(param, setting){
            state.teleport.config[param] = setting;
            return setting;
        };
        var DEFAULTPLAYER,
        AUTOTELEPORT = getStateParam("AUTOTELEPORT",true),
        AUTOPING = getStateParam("AUTOPING",true),
        HIDEPING = getStateParam("HIDEPING",true),
        SHOWSFX = getStateParam("SHOWSFX",true),
        PLAYERINDEX = {},
        // The emojiObj is used to store the graphics used for config buttons and activation buttons
        emojiObj = { 
            'on': 0x2705,
            'off': 0x274C,
            'active':0x1F4A5,
            'inactive':0x1F6A7,
            'edit':0x1F528,
            'config':0x1F529,
            'linked':0x1F517,
            'teleport':0x2728,
            'teleportall':0x1F52E,
            'portal':0x1F300,
            'restrictedportal':0x1F365,
            'help':0x1F9ED,
            'error':0x26A0,
            'locked':0x1F6D1,
            'unlocked':0x1F7E2,
            'ping':0x1F50E,
            'menu':0x1F53C,
            'pad':0x1F4AB,
            'editname':0x1F4DD,
            'message':0x1F4AD,
            'random':0x1F500,
            'select':0x1F520
        },
        defaultButtonStyles = 'border:1px solid black;border-radius:.5em;padding:2px;margin:2px;font-weight:bold;text-align:right;',
        configButtonStyles = 'width:150px;background-color:white;color:black;font-size:.9em;',
        emojiButtonStyles = 'width:18px;height:18px;background-color:#efefef;color:black;font-size:1em',
        emojiButtonBuilder = function(contentsObj){
            let results = '<a title="'+ contentsObj.param + '" href="!teleport --',
            subconstruct = txt => results += txt;
            subconstruct( contentsObj.apicall );
            subconstruct('" style="' );
            subconstruct( defaultButtonStyles + emojiButtonStyles + '">');
            if(contentsObj.icon){
                subconstruct(String.fromCodePoint(emojiObj[contentsObj.icon]));
            }else{
                subconstruct( ( ( Teleport.configparams[contentsObj.param.toString()])?String.fromCodePoint(emojiObj.on):String.fromCodePoint(emojiObj.off) ) );
            }
            subconstruct('</a>');
            return results
        },
        configButtonBuilder = function(contentsObj){
            let results = '<a href="!teleport --',
            subconstruct = txt => results += txt;
            subconstruct( contentsObj.apicall );
            subconstruct('" style="background-color:white' );
            subconstruct(';color:black;' + defaultButtonStyles + configButtonStyles + '">');
            if(contentsObj.icon){
                subconstruct( contentsObj.param + ': ' + String.fromCodePoint(emojiObj[contentsObj.icon]));
            }else{
                subconstruct( contentsObj.param + ': ' + ((Teleport.configparams[contentsObj.param.toString()])?String.fromCodePoint(emojiObj.on):String.fromCodePoint(emojiObj.off)));
            }
            subconstruct('</a>');
            return results
        },
        // Trying to create a !help function to help players set up teleport tokens. May include a wizard. 
        // This may include a re-do on how tokens are registered and how they are kitted out.
        helpDisplay = function(){
            
            let output = ' <div style="border: 1px solid black; background-color: white; padding: 3px 3px;margin-top:20px">'
            +'<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 100%;style="float:left;border-bottom:1px solid black;">';
            output +='Teleport Help';
            output +='</div>';
            output +='<p>Teleport is an API script that uses chat menus and chat buttons to manage teleport pads.</p>';
            output +='<p>This includes creating teleport pads, registering teleport pad destinations, managing general settings,' + 
                      ' locking pads individually from autoteleporting, and un-linking teleport pad destinations.</p>';
            output +='<p>Each pad has an individual menu for invoking teleport for a selected token, and for pinging a pad if you cannot locate it on the page.</p>';
            output +='<p>'+ configButtonBuilder({param:'Main Menu',apicall:'menu',icon:'help'}) +'</p>';
            output +='</div>';
            outputToChat(output); 
            
        },
        menuDisplay = function(){
            let output = ' <div style="border: 1px solid black; background-color: white; padding: 3px 3px;margin-top:20px">'
            +'<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 100%;style="float:left;">';
            output +='Main Menu';
            output +='</div>';
            output +='<p>Commands in Teleport are always preceded by !teleport.</p>';
            output +='<p>' + configButtonBuilder({param:'Create Teleport Pad',apicall:'createpad|?{Pad Name|Telepad ' + state.teleport.increment++ + '}',icon:'teleportall'}) + '</p>';
            output +='<p>' + configButtonBuilder({param:'Config Panel',apicall:'config',icon:'config'}) + '</p>';
            output +='<p>' + configButtonBuilder({param:'Teleporter Pad List',apicall:'padlist',icon:'portal'}) + '</p>';
            output +='</div>';
            outputToChat(output); 
        },
        configDisplay = function(){
            let output = ' <div style="border: 1px solid black; background-color: white; padding: 3px 3px;margin-top:20px;">'
            +'<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 100%;style="float:left;">';
            output +='Configuration Menu    ' + emojiButtonBuilder( {param:'Main Menu',apicall:'menu',icon:'help'} ) + '';
            output +='</div><table style="border:1px solid black;">';
            _.each(Object.keys(state.teleport.config), function(param){
                output += '<tr><td style="text-align:right;">' + configButtonBuilder({param:param,apicall:param.toLowerCase()}) + '</td></tr>';
            });
            output +='</table></div>';
            outputToChat(output); 
        },
        padDisplay = function(){
            let output = '',
            padlist=teleportPadList();
            output = ' <div style="border: 1px solid black; background-color: white; padding: 3px 3px;margin-top:20px">'
            +'<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 100%;style="float:left;">';
            output +='Teleport Pad List    ' + emojiButtonBuilder( {param:'Main Menu',apicall:'menu',icon:'help'} ) + '';
            output +='</div><table style="border:1px solid black;width:100%">';
            _.each(padlist, function(pad){
                let targettext = '';
                
                if(pad.get('bar1_max') !==''){
                    let targetlist = pad.get('bar1_max');
                    if(Array.isArray(targetlist)){
                        let count = 0;
                        _.each(targetlist, function(targ){
                            if(count>0){
                                targettext += ',';
                            }
                            targettext += getObj('graphic',targ).get('name');
                            count++
                        });
                    }else{
                        targettext += getObj('graphic',pad.get('bar1_max')).get('name');
                    }
                }else{
                    targettext += 'not linked';
                }
                output += '<tr><td style="text-align:left;font-weight:bold;" colspan="5">' + pad.get('name') + '</td></tr>';
                output += '<tr>'
                output += '<td>' + emojiButtonBuilder( {param:'Ping Pad',apicall:'pingpad|' + pad.get('_id'),icon:'ping'} ) + '</td>';
                output += '<td>' + emojiButtonBuilder( {param:'Edit Pad',apicall:'editpad|' + pad.get('_id'),icon:'edit'} ) + '</td>';
                output += '<td>' + emojiButtonBuilder( {param:'Teleport Token',apicall:'teleporttoken|' + pad.get('_id'),icon:'teleport'} ) + '</td>';
                if(pad.get('status_dead')){
                    output += '<td>' + emojiButtonBuilder( {param:'Unlock Pad',apicall:'lockportal|' + pad.get('_id'),icon:'locked'} ) + '</td>';
                }else{
                    output += '<td>' + emojiButtonBuilder( {param:'Lock Pad',apicall:'lockportal|' + pad.get('_id'),icon:'unlocked'} ) + '</td>';
                }
                output += '<td>' + emojiButtonBuilder( {param:'Link Pad',apicall:'linkpad|' + pad.get('_id'),icon:'linked'} ) + '</td>';
                output += '</tr>';
               
                output += '<tr><td style="text-align:left;border-bottom:1px solid black;" colspan="5"> linked to: ';
                   output += targettext;
                output += '</td></tr>';
            });
            output +='</table></div>';
            outputToChat(output); 
        },
        editPadDisplay = function(padid){
            let pad = getObj( "graphic" , padid ),
            targettext = '',
            output = ''
            if(pad.get('bar1_max') !==''){
                let targetlist = pad.get('bar1_max');
                if(Array.isArray(targetlist)){
                    let count = 0;
                    _.each(targetlist, function(targ){
                        if(count>0){
                            targettext += ',';
                        }
                        targettext += getObj('graphic',targ).get('name');
                        count++
                    });
                }else{
                    targettext += getObj('graphic',pad.get('bar1_max')).get('name');
                }
            }else{
                targettext += 'not linked';
            }
            output = ' <div style="border: 1px solid black; background-color: white; padding: 3px 3px;margin-top:20px">'
            +'<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 100%;style="float:left;">';
            output +='Pad Edit for ' + pad.get('name') + emojiButtonBuilder( {param:'Teleport Pad List',apicall:'padlist',icon:'portal'} ) + '';
            output +='</div><table style="border:1px solid black;width:100%">';
            output += '<tr><td style="text-align:left;font-weight:bold;">' + pad.get('name') + '</td><td>' + emojiButtonBuilder( {param:'Rename Token',apicall:'renamepad ?{Pad Name|'+ pad.get('name') +'}|' + pad.get('_id'), icon:'editname'} ) + '</td></tr>';
            output += '<tr><td>Ping</td><td>' + emojiButtonBuilder( {param:'Ping Pad',apicall:'pingpad|' + pad.get('_id'),icon:'ping'} ) + '</td></tr>';
            output += '<tr><td>SFX:' + ((pad.get('bar2_value') !== '')?pad.get('bar2_value'):'none')
            let sfxapicall = 'editpdsfx ?{Special Effects Shape|bomb|bubbling|burn|burst|explode|glow|missile|nova|none}-' + 
            '?{Special Effects Color|acid|blood|charm|death|fire|frost|holy|magic|slime|smoke|water}' + '|' + pad.get('_id');
            //let apicall = 'editpadsfx ?{Options|Choose one:,&#63;{Choose an option&#124;Try again.&#124;A&#124;B&#124;C&#124;D&#124;E&#124;F&#124;G&#125;|A|B|C|D|E|F|G} |' + pad.get('_id');
            output += configButtonBuilder({param:'Set Pad SFX',apicall:sfxapicall,icon:'teleportall'}) 
            output += '</td><td>' + emojiButtonBuilder( {param:'Show SFX',apicall:'showpdsfx|' + pad.get('_id'),icon:'active'} ) + '</td></tr>';
            //
            
            output += '<tr><td>Message:' + ((pad.get('bar2_max') !== '')?pad.get('bar2_max'):'none');
            let msgapicall = 'editpdmsg ?{Activation Message|' + ((pad.get('bar2_max') !== '')?pad.get('bar2_max'):'none') + '}' + '|' + pad.get('_id');
            //let apicall = 'editpadsfx ?{Options|Choose one:,&#63;{Choose an option&#124;Try again.&#124;A&#124;B&#124;C&#124;D&#124;E&#124;F&#124;G&#125;|A|B|C|D|E|F|G} |' + pad.get('_id');
            output += configButtonBuilder({param:'Set Pad Message',apicall:msgapicall,icon:'message'}) 
            output += '</td><td>' + emojiButtonBuilder( {param:'Show Message',apicall:'showpdmsg|' + pad.get('_id'),icon:'message'} ) + '</td></tr>';
            
            //
            output += '<tr><td>Teleport Token To</td><td>' + emojiButtonBuilder( {param:'Teleport Token',apicall:'teleporttoken|' + pad.get('_id'),icon:'teleport'} ) + '</td></tr>';
            if(pad.get('status_dead')){
                output += '<tr><td>Status: Locked</td><td>' + emojiButtonBuilder( {param:'Unlock Pad',apicall:'lockpad|' + pad.get('_id'),icon:'locked'} ) + '</td></tr>';
            }else{
                output += '<tr><td>Status: Unlocked</td><td>' + emojiButtonBuilder( {param:'Lock Pad',apicall:'lockpad|' + pad.get('_id'),icon:'unlocked'} ) + '</td></tr>';
            }
            if(pad.get('fliph')){
                output += '<tr><td>Multi-Link: Select</td><td>' + emojiButtonBuilder( {param:'Set Random Pad',apicall:'selectpadset|' + pad.get('_id'),icon:'select'} ) + '</td></tr>';
            }else{
                output += '<tr><td>Multi-Link: Random</td><td>' + emojiButtonBuilder( {param:'Set Select Pad',apicall:'selectpadset|' + pad.get('_id'),icon:'random'} ) + '</td></tr>';
            }
            output += '<tr><td>Link Pad</td><td>' + emojiButtonBuilder( {param:'Link Pad',apicall:'linkpad|' + pad.get('_id'),icon:'linked'} ) + '</td></tr>';
            output += '<tr><td style="text-align:left;border-bottom:1px solid black;" colspan="2"> linked to: ';
               output += targettext;
            output += '</td></tr>';
            output +='</table></div>';
            outputToChat(output); 
        },
        teleportSelectList = function(params){
            let pad=params.pad,obj=params.obj;
            let returntext = '?{Select a Destination';
            if(pad.get('bar1_max') !==''){
                let targetlist = pad.get('bar1_max');
                if(Array.isArray(targetlist)){
                    _.each(targetlist, function(targ){
                        returntext += '|' + getObj('graphic',targ).get('name') + ',' + getObj('graphic',targ).get('_id');
                    });
                    returntext += '}';
                }
            }
            let player = findTokenPlayer({pad:pad,obj:obj});
            log(player.get('_displayname'));
            outputToChat(configButtonBuilder( {param:'Select Destination',apicall:'teleporttoken|' + returntext,icon:'teleport'} ), player.get('_displayname'));
            // outputToChat('!teleport --teleporttoken|' + returntext);
        },
        // This check is exclusively for auto-teleport, and never occurs
        // for chat-based teleport or teleport buttons. 
        // This can be useful for temporarily one-way portals for example
        // Otherwise one-way portals can have no linked portal, meaning they
        // are only destination portals for auto-teleport. 
        teleportPadCheck = function(obj){
            // Checking overlap - any overlap on drop triggers teleport. 
            // Changing to circle overlap - 
            //   - Add width and height, divide by 2, divide by 2 again to get average radius
            //   - Do this for pad and token
            //   - Check for hypotenuse between two points on right triangle
            //   - If hypotenuse is greater than radius 1 + radius 2, they are not overlapping.
            // Disadvantage: not as accurate as square-overlap
            // Advantage: feels more realistic given that most tokens are not square with transparency.
            let objrad = (obj.get('width') + obj.get('height'))/4; 
            
            var padList = teleportPadList();
            _.each(padList, function(pad){
                if(pad.get('status_dead') === true){
                    return;
                }
                let padrad = (pad.get('width') + pad.get('height'))/4,
                hypot = Math.ceil(Math.sqrt(Math.pow((pad.get('left') - obj.get('left')),2) + Math.pow((pad.get('top') - obj.get('top')),2)));
                // log("hypot:" + hypot + " | objrad:" + objrad + " | padrad:" + padrad + " | test:" + (hypot < (objrad+padrad)));
                if(hypot < (objrad+padrad)){
                    teleportMsg({pad:pad,tgt:obj});
                    let targetlist = pad.get('bar1_max');
                    if(Array.isArray(targetlist) && pad.get('fliph') === true){
                        teleportSelectList({pad:pad,obj:obj});
                        return;
                    }
                    let nextpad = teleportAutoNextTarget(pad);
                    if(nextpad){
                        teleportToken({obj:obj,pad:nextpad});
                    }
                }else{
                    return;
                }
            });
        },
        teleportAutoNextTarget = function(pad){
            // in case of accidental self-reference, just don't teleport 
            // this will include the randomizer - thining of whether to include inactivated portals... 
            if(pad.get('bar1_max') === ''){ return null };
            let targetlist = pad.get('bar1_max'),pickedpad,count=0,randnum=0;
            if(Array.isArray(targetlist)){
                let randnum = Math.floor(Math.random()*targetlist.length);
                _.each(targetlist, function(targ){
                    
                    if(randnum === count){
                        pickedpad = getObj('graphic',targ);
                    }
                    count++;
                });
            }else{
                 pickedpad = getObj('graphic',targetlist);
            }
            return pickedpad;
        },
        teleportPadList = function(){
            var currentPageId = Campaign().get('playerpageid');
            var rawList = findObjs({_subtype:'token',layer:'gmlayer'}),
            padList = [];
            _.each(rawList, function(padCheck){
              if(typeof padCheck.get('bar1_value') !== 'string'){
                  return;
              }
              if( padCheck.get('bar1_value').indexOf('teleportpad') === 0 && padCheck.get('_pageid') === currentPageId){
                  padList.push(padCheck);
              }
            })
            return padList;
        },
        teleportPad = function(){},
        teleportToken = function(params){
            let obj = params.obj, pad = params.pad;
            obj.set("layer","gmlayer")
            setTimeout(function(){
                obj.set("left",pad.get('left'));
                obj.set("top",pad.get('top'));
                setTimeout(function(){
                    obj.set("layer","objects");
                    if(Teleport.configparams.AUTOPING){
                        teleportPing({obj:obj,pad:pad});
                    }
                    if(Teleport.configparams.SHOWSFX){
                        teleportSFX({obj:obj,pad:pad});
                    }
                },500);
            },100);
        },
        teleportPing = function(params){
            let obj=params.obj, pad=params.pad, player, oldcolor;
            // figure out if there is a player attached
            if(Teleport.configparams.HIDEPING){
                player = findTokenPlayer({obj:obj,pad:pad});
                // log("tp:player: " + player);
                oldcolor = player.get('color');
                player.set('color','transparent');
            
                setTimeout(function(){
                    sendPing(pad.get('left'), pad.get('top'), Campaign().get('playerpageid'), player.id, true, player.id);
                    setTimeout(function(){
                        player.set('color',oldcolor);
                    },1000);
                },10)
                
            }
        },
        teleportSFX = function(params){
            let pad = params.pad;
            if(pad.get('bar2_value') !== ''){
                setTimeout(function(){
                    spawnFx(pad.get('left'), pad.get('top'), pad.get('bar2_value'), Campaign().get('playerpageid'));
                },10);
            }
        },
        teleportMsg = function(params){
            let pad = params.pad, tgt=params.tgt, msg='';
            if(pad.get('bar2_max') !== ''){
                msg = pad.get('bar2_max').replace('[target]',tgt.get('name'));
                outputOpenMessage(msg);
            }
        },
        findTokenPlayer=function(params){
            let obj=params.obj,pad=params.pad, character, controller;
            character=(obj.get('represents'))?getObj("character", obj.get('represents')):null;
            controller = (character)?character.get('controlledby'):'';
                if(controller !== '' && controller !== 'all' ){
                    player=getObj("player", controller);
                }else{
                    player=DEFAULTPLAYER;
                }
            return player
        },
        addPortalPadLink = function(params){
            let pad=params.pad,linktargetids=params.linktargetids,completelinklist=[];
            _.each(linktargetids, function(linktarg){
                if(pad.get('_id') === linktarg._id){
                    outputToChat("A portal pad cannot target itself.");
                    return
                }
                let obj = getObj('graphic',linktarg._id);
                    if(obj.get('bar1_value') === 'teleportpad'){
                           completelinklist.push(obj.get('_id'));
                    }else{
                    outputToChat("A Link target for autoteleport needs to also be a teleport pad.");
                }
            });
            pad.set("bar1_max",completelinklist);
        },
        editPadSFX = function(params){
            let pad = getObj('graphic',params.pad), sfx=params.sfx;
            if(sfx && sfx.indexOf('none') !== -1){
               sfx=''; 
            }
            pad.set('bar2_value',sfx);
            editPadDisplay(pad.get('_id'));
        },
        showPadSFX = function(params){
            let pad = getObj('graphic',params.pad);
            if(pad.get('bar2_value') !== ''){
                // log(pad.get('bar2_value'));
                spawnFx(pad.get('left'), pad.get('top'), pad.get('bar2_value'), Campaign().get('playerpageid'));
            }
        },
        editPadMsg = function(params){
            let pad = getObj('graphic',params.pad), msg=params.msg;
            if(msg && msg.indexOf('none') !== -1){
               msg=''; 
            }
            pad.set('bar2_max',msg);
            editPadDisplay(pad.get('_id'));
        },
        showPadMsg = function(params){
            let pad = getObj('graphic',params.pad);
            if(pad.get('bar2_max') !== ''){
                outputToChat(pad.get('bar2_max'));
            }
        },
        msgHandler = function(msg){
            
            if(msg.type === 'api' && msg.content.indexOf('!teleport') === 0 ){
                if(msg.content.indexOf('--help') !== -1){
                    helpDisplay();
                }
                if(msg.content.indexOf('--menu') !== -1){
                    menuDisplay();
                }
                if(msg.content.indexOf('--config') !== -1){
                    configDisplay();
                }
                if(msg.content.indexOf('--padlist') !== -1){
                    padDisplay();
                }
                
                if(msg.content.indexOf('--teleporttoken') !== -1){ 
                    if(typeof msg.selected !== 'undefined'){
                        let pad = getObj('graphic',msg.content.split('|')[1]);
                        let obj = getObj('graphic',msg.selected[0]._id);
                        teleportToken({obj:obj,pad:pad});
                    }else{
                        outputToChat("Select a target token to teleport before clicking teleport.");
                    }
                }
                if(msg.content.indexOf('--linkpad') !== -1){ 
                    let pad = getObj('graphic',msg.content.split('|')[1]);
                    if(typeof msg.selected !== 'undefined'){
                        addPortalPadLink({pad:pad,linktargetids:msg.selected});
                    }else{
                        outputToChat("Clicking Link without selecting a token clears the teleport pad link.");
                        pad.set("bar1_max","");
                    }
                    padDisplay();
                }
                
                if(msg.content.indexOf('--createpad') !== -1){
                    if(typeof msg.selected ==='undefined'){
                        return outputToChat('Select a token to be the teleport pad.');
                    }
                    let pad = getObj('graphic',msg.selected[0]._id);
                    if(pad.get('_subtype') === 'card'){ return outputToChat("Select a target token that is not a card.")}
                    if(pad.get('bar1_value') === 'teleportpad'){return outputToChat("Select a target token that is not already a teleport pad.")}
                    pad.set({
                        layer:'gmlayer',
                        bar1_value:'teleportpad',
                        name: ((pad.get('name') === "")?msg.content.split('|')[1]:pad.get('name')),
                        showname: true
                    })
                    padDisplay();
                }
                if(msg.content.indexOf('--renamepad') !== -1){
                    let pad = getObj('graphic',msg.content.split('|')[1]);
                    pad.set({
                        name: msg.content.split('|')[0].split('--renamepad ')[1]
                    })
                    editPadDisplay(msg.content.split('|')[1]);
                }
                
                if(msg.content.indexOf('--editpad') !== -1){
                    editPadDisplay(msg.content.split('|')[1]);
                }
                if(msg.content.indexOf('--editpdsfx') !== -1){
                    log(msg.content);
                    editPadSFX( {pad:msg.content.split('|')[1],sfx:msg.content.split('|')[0].split(' ')[2]} );
                }
                if(msg.content.indexOf('--showpdsfx') !== -1){
                    log(msg.content);
                    showPadSFX({pad:msg.content.split('|')[1]});
                }
                
                if( msg.content.indexOf('--editpdmsg') !== -1){
                    log(msg.content);
                    editPadMsg( { pad:msg.content.split('|')[1], msg:msg.content.split('|')[0].split('--editpdmsg ')[1]} );
                }
                
                if(msg.content.indexOf('--showpdmsg') !== -1){
                    log(msg.content);
                    showPadMsg({pad:msg.content.split('|')[1]});
                }
                
                if(msg.content.indexOf('--lockportal') !== -1){
                        let pad = getObj('graphic',msg.content.split('|')[1]);
                        let currentstatus = pad.get('status_dead');
                        pad.set('status_dead', (currentstatus)?false:true);
                        padDisplay();
                }
                if(msg.content.indexOf('--lockpad') !== -1){
                        let pad = getObj('graphic',msg.content.split('|')[1]);
                        let currentstatus = pad.get('status_dead');
                        pad.set('status_dead', (currentstatus)?false:true);
                        editPadDisplay(msg.content.split('|')[1]);
                }
                if(msg.content.indexOf('--selectpadset') !== -1){
                    let pad = getObj('graphic',msg.content.split('|')[1]);
                        let currentstatus = pad.get('fliph');
                        pad.set('fliph', (currentstatus)?false:true);
                        editPadDisplay(msg.content.split('|')[1]);
                }
                if(msg.content.indexOf('--pingpad') !== -1){
                        let pad = getObj('graphic',msg.content.split('|')[1]);
                        setTimeout(function() {
                            sendPing(pad.get('left'), pad.get('top'), Campaign().get('playerpageid'), null, true, DEFAULTPLAYER.get('_id'));
                        }, 10);
                }
                if(msg.content.indexOf('--autoteleport') !== -1){
                    Teleport.configparams.AUTOTELEPORT = (Teleport.configparams.AUTOTELEPORT)?false:true;
                    setStateParam('AUTOTELEPORT',Teleport.configparams.AUTOTELEPORT);
                    configDisplay();
                }else if(msg.content.indexOf('--autoping') !== -1){
                    Teleport.configparams.AUTOPING = (Teleport.configparams.AUTOPING)?false:true;
                    setStateParam('AUTOPING',Teleport.configparams.AUTOPING);
                    configDisplay();
                }else if(msg.content.indexOf('--hideping') !== -1){
                    Teleport.configparams.HIDEPING = (Teleport.configparams.HIDEPING)?false:true;
                    setStateParam('HIDEPING',Teleport.configparams.HIDEPING);
                    configDisplay();
                }else if(msg.content.indexOf('--showsfx') !== -1){
                    Teleport.configparams.SHOWSFX = (Teleport.configparams.SHOWSFX)?false:true;
                    setStateParam('SHOWSFX',Teleport.configparams.SHOWSFX);
                    configDisplay();
                }
            }
        
        },
        outputToChat = function(msg,tgt){
            tgt = (tgt !== undefined && tgt !== null)?tgt:'gm';
            sendChat('system','/w "' + tgt + '" ' + msg,null,{noarchive:true});
        },
        outputOpenMessage = function(msg,tgt){
            formattedmessage = '<div><div>' + msg + '</div></div>';
            sendChat('Environment', formattedmessage);
        },
        autoTeleportCheck = function(obj){
            if(Teleport.configparams.AUTOTELEPORT===false){
                return;
            }
            if(obj.get('_subtype') === "token" && obj.get('lastmove') !== '' && obj.get('layer') !== 'gmlayer' ){
                teleportPadCheck(obj);
            }
        },
        RegisterEventHandlers = function() {
            on('chat:message', msgHandler);
            on('change:graphic', autoTeleportCheck);
            DEFAULTPLAYER = (function(){
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
                            })();
            helpDisplay();
        };     
        
        return {
            startup: RegisterEventHandlers,
            configparams: {
                "AUTOTELEPORT": AUTOTELEPORT,
                "AUTOPING": AUTOPING,
                "HIDEPING": HIDEPING,
                "SHOWSFX": SHOWSFX
            }
        }
        
    }());


on('ready',() => {    
    Teleport.startup();
});
