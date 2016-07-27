var express = require('express');
var pg = require('pg');
var path = require("path");
pg.defaults.ssl = true;
var bodyParser = require("body-parser");
var dateFormat = require('dateformat');
var client = new pg.Client();

var main_sql = "";
var exclude_att = ["FirstName","LastName","email","PostalCode","SubscriberKey","LUWID","RecordType"];
var bCampaignChecked = false;
var bCampaignExists = false;
var bSubscriberKeyChecked = false;
var bSubscriberKeyFound = false;
var bEmailAddressChecked = false;
var bEmailAddressFound = false;
//client.connect(process.env.DATABASE_URL, function(err, xClient) {
//client.connect(function(err) {
/*client.connect(process.env.DATABASE_URL, function(err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  console.log('Connected to postgres! Getting schemas...');

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables;')
    .on('row', function(row) {
      console.log(JSON.stringify(row));
    });
});*/

var app = express();
app.use(express.static(__dirname + "/public"));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
//app.use(express.json());       // to support JSON-encoded bodies

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.set('port', (process.env.PORT || 5000));

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.get('/', function(request, response, next) {
  response.render('pages/index');
});

app.get('/campaignmemberdetails', function (request, response, next) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    //client.query('select * from uwwsharedcrm.campaign_member_activity__c', function(err, result) {
    client.query(buildQuery(1), function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { 
       	//console.log ("1-rows: "+result.rows);
		//console.log(JSON.stringify(result.rows));
       	//displayObject(result.rows);
       	response.render('pages/campaignmemberdetails', {results: result.rows} 
       ); }
    });
  });
});

app.post('/campaignmemberdetails', function (request, response, next) {
	var bContinueProcessing = true;
	//console.log("REQUEST     : "+request);
	//console.log("REQUEST BODY: "+request.body);
    //console.log(JSON.stringify(request.body));
	/*for (var prop in request.body) {
	    if (request.body.hasOwnProperty(prop)) {
	        console.log("1--"+prop +"-->"+request.body[prop]);
			console.log("object: "+JSON.stringify(request.body[prop]));
	    }
	}    
	console.log("REQUEST BODY: "+JSON.stringify(request.body));*/
	var newCampaignDetail = request.body;
	newCampaignDetail.activity_date__c = dateFormat(new Date(), "yyyy-mm-dd");
	newCampaignDetail.activity_date_and_time__c = dateFormat(new Date(), "yyyy-mm-dd h:MM:ss");
	console.log("newCampaignDetail: "+JSON.stringify(newCampaignDetail));
	var validationErrors  = "";
	
	validationErrors=performValidations(newCampaignDetail);
	//console.log("1-Validation errors: "+validationErrors+" len: "+validationErrors.length);
	if  (validationErrors.length>0) {
		bContinueProcessing = false;
		console.log("2-Validation errors: "+validationErrors+" len: "+validationErrors.length);
		response.send("Validation errors: "+validationErrors);
	}
	
	/*bCampaignExists = campaignExists (newCampaignDetail);
	console.log("returning results of campaignExists: " + bCampaignExists);
	if (bCampaignExists=="true") {
		console.log("Campaign exists!: "+bCampaignExists);
	} else {
		console.log("xNon-existent campaign ID: "+bCampaignExists);
		response.send("yNon-existent campaign ID");
	}*/
	
	// No errors from the validations, so we can continue
	if ( bContinueProcessing ) {
	
		//The logic below first checks to see if the campaign exists
		var sSQL = buildQuery(2)+newCampaignDetail.Campaign__c+"'";
		console.log("##### 100 ### bCampaignChecked: "+bCampaignChecked+" ### bCampaignExists: "+bCampaignExists+
					" ### bSubscriberKeyChecked: "+bSubscriberKeyChecked+" ### bSubscriberKeyFound: "+bSubscriberKeyFound+
					" ### bEmailAddressChecked: "+bEmailAddressChecked+" ### bEmailAddressFound: "+bEmailAddressFound);
		console.log("campaignExists: executing query: "+sSQL);
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			client.query(sSQL, function(err, result) {
				done();
				if (err) { 
					console.error(err); 
					console.log("Non-existent campaign ID: "+newCampaignDetail.Campaign__c);
					response.send("Non-existent campaign ID: "+newCampaignDetail.Campaign__c+"\n"+err);
				} else { 
					if ( result.rows.length > 0 ) {
						bCampaignExists = true;
						console.log("Campaign exists!: "+bCampaignExists);
						console.log ("1-rows: "+JSON.stringify(result.rows)+
										" rows: "+result.rows.length+
										" sfid: "+result.rows[0].sfid);
						checkForContactBySubscriberKey(newCampaignDetail, request, response, next);
					} else {
						console.log("Non-existent campaign ID: "+newCampaignDetail.Campaign__c);
						response.send("Non-existent campaign ID: "+newCampaignDetail.Campaign__c);
					}
				}
			});
			
		});
	}
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

function checkForContactBySubscriberKey (newCampaignDetail, request, response, next) {
	console.log("&&&&&&&&&&& inside: checkForContactBySubscriberKey");
	console.log("Which record to save: bCampaignExists: "+bCampaignExists+
					" and Activity_Type__c: "+newCampaignDetail.Activity_Type__c);
	console.log("##### 200 ### bCampaignExists: "+bCampaignExists+
				" ### bSubscriberKeyFound: "+bSubscriberKeyFound+
				" ### bEmailAddressFound: "+bEmailAddressFound);
	//if ( bCampaignExists && newCampaignDetail.Activity_Type__c == "Video" ) {
	
	//This logic tries to determine if there is an existing contact for the subscriber key
	//   if it was passed
	if ( newCampaignDetail.SubscriberKey.length > 0 ) {
		console.log("looking for contact based on subscriber key: query: "+buildQuery(3)+newCampaignDetail.SubscriberKey+"'");
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			client.query(buildQuery(3)+newCampaignDetail.SubscriberKey+"'", function(err, result) {
				console.log("after query for subscriberkey");
				done();
				if (err) { 
					console.error(err); 
					console.log("Cant find contact for subscriber key: "+newCampaignDetail.SubscriberKey);
					if ( newCampaignDetail.email.length > 0 ) {
						checkForContactByEmail ( newCampaignDetail, request, response, next);
					} else {
						saveCampaignMemberActivity ( newCampaignDetail, request, response, next);
					}
				} else { 
					if ( result.rows.length > 0 ) {
						console.log ("2-rows: "+JSON.stringify(result.rows)+
									" rows: "+result.rows.length+
									" sfid: "+result.rows[0].sfid);
						bSubscriberKeyFound = true;
						console.log("Found contact for subscriber key: "+newCampaignDetail.SubscriberKey);
						newCampaignDetail.contact__c=result.rows[0].sfid;
						saveCampaignMemberActivity ( newCampaignDetail, request, response, next);
					} else if ( newCampaignDetail.email.length > 0 ) {
						checkForContactByEmail ( newCampaignDetail, request, response, next);
					} else {
						saveCampaignMemberActivity ( newCampaignDetail, request, response, next);
					}
				}
			});
		});
	} else if ( newCampaignDetail.email.length > 0 ) {
		checkForContactByEmail ( newCampaignDetail, request, response, next);
	} else {
		saveCampaignMemberActivity ( newCampaignDetail, request, response, next);
	}

	
}

function checkForContactByEmail(newCampaignDetail, request, response, next) {
	console.log("&&&&&&&&&&& inside: checkForContactByEmail");
	console.log("did we find the subscriber key contact: "+bSubscriberKeyFound+" added to object: "+
			JSON.stringify(newCampaignDetail));
	console.log("##### 300 ### bCampaignExists: "+bCampaignExists+
				" ### bSubscriberKeyFound: "+bSubscriberKeyFound+
				" ### bEmailAddressFound: "+bEmailAddressFound);
	//This logic tries to determine if there is an existing contact for the email address
	//   if subscriber key didn't find the record
	if ( newCampaignDetail.email.length > 0 ) {
		console.log("looking for contact based on email: query: "+buildQuery(4)+newCampaignDetail.email+"'");
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			client.query(buildQuery(4)+newCampaignDetail.email+"'", function(err, result) {
				done();
				if (err) { 
					console.error(err); 
					console.log("Cant find contact for email address: "+newCampaignDetail.email);
					saveCampaignMemberActivity(newCampaignDetail, request, response, next);
				} else { 
					if ( result.rows.length > 0 ) {
						bEmailAddressFound = true;
						console.log("Found contact for email address: "+newCampaignDetail.email);
						console.log ("3-rows: "+JSON.stringify(result.rows)+
									" rows: "+result.rows.length+
									" sfid: "+result.rows[0].sfid);
						newCampaignDetail.contact__c=result.rows[0].sfid;
						saveCampaignMemberActivity(newCampaignDetail, request, response, next);
					}
				}
			});
		});
	}
	console.log("did we find the email contact: added to object: "+
			JSON.stringify(newCampaignDetail));
	console.log("##### 400 ### bCampaignExists: "+bCampaignExists+
				" ### bSubscriberKeyFound: "+bSubscriberKeyFound+
				" ### bEmailAddressFound: "+bEmailAddressFound);
}

function saveCampaignMemberActivity ( newCampaignDetail, request, response, next) {
	console.log("&&&&&&&&&&& inside: saveCampaignMemberActivity");
	
	//Now we can determine which record type (video, quiz, opportunity, future) was received
	if ( newCampaignDetail.RecordType == "Video" ) {
		newCampaignDetail.RecordTypeId="0122C0000004HnQQAU";			
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			client.query(postVideoResults(newCampaignDetail), function(err, result) {
				done();
				if (err) { 
					console.error(err); 
				} else { 
					console.log("Campaign member activity posted: "+newCampaignDetail.Activity_Type__c);
					if ( !bSubscriberKeyFound && !bEmailAddressFound ) {
						//createLead ( newCampaignDetail, request, response, next);
					}
				}
			});
		});
		response.send(200);
	}
}

function createLead ( newCampaignDetail, request, response, next) {
	console.log("&&&&&&&&&&& inside: createLead");
	
	//Now we can determine which record type (video, quiz, opportunity, future) was received
	if ( newCampaignDetail.RecordType == "Video" ) {
		newCampaignDetail.RecordTypeId="0122C0000004HnQQAU";			
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			client.query(buildLeadSQL(newCampaignDetail), function(err, result) {
				done();
				if (err) { 
					console.error(err); 
				} else { 
					console.log("Lead Record save!");
				}
			});
		});
		response.send(200);
	}
}

function buildLeadSQL (newCampaignDetail) {
	var lead_include = ["FirstName","LastName","email","PostalCode",
						"SubscriberKey","LUWID","Campaign__c","utm_source__c"];
	var lead_attribs = ["firstname","lastname","email","acu_primary_mailing_zip__c",
						"acu_subscriber_key__c","acu_luw_id__c","Campaign__c","dsog_utm_source__c"];
	console.log("&&&&&&&&&&& inside: buildLeadSQL");
	var sqlInsert = "insert into uwwsharedcrm.lead (";
	var sqlFields = "";
	var sqlValues = ") values (";
	var i = 0;
	
	for (var prop in newCampaignDetail) {
	    if (newCampaignDetail.hasOwnProperty(prop) &&
	    	lead_include.indexOf(prop) >= 0) {
	    	console.log("is "+prop+" in "+
	    			lead_include+" ("+lead_include.indexOf(prop)+")");
	    	if ( i++ > 0 ) {
	    		sqlFields += ",";
	    		sqlValues += ",";
	    	}
	    	sqlFields += lead_attribs[lead_include.indexOf(prop)];
	    	sqlValues += "'" + newCampaignDetail[prop] + "'";
	        console.log(lead_attribs[lead_include.indexOf(prop)] +"-->"+newCampaignDetail[prop]);
	    }
	}
	console.log("buildLeadSQL: sql to execute: "+sqlInsert+sqlFields+sqlValues+")");
	return sqlInsert+sqlFields+sqlValues+")";    
}


function buildQuery (opt) {
	var rtnSQL = "";
	if (opt == 1 ) {
		rtnSQL = "select "+
			"a.Id,"+
			"a.sfid,"+
			"a.Name,"+
			"a.Campaign__c as \"CampaignID\","+
			"c.Name as \"CampaignName\","+
			"a.Activity_Type__c as \"ActivityType\","+
			"a.Activity_Result__c as \"ActivityResult\","+
			"a.RecordTypeId,"+
			"a.Contact__c as \"ContactId\","+
			"a.Lead__c as \"LeadId\","+
			"a.Opportunity_Name__c as \"OpportunityName\","+
			"a.Opportunity_Type__c as \"OpportunityType\","+
			"a.Quiz_Name__c as \"QuizName\","+
			"a.Quiz_Type__c as \"QuizType\","+
			"a.Video_Name__c as \"VideoName\","+
			"a.Video_Type__c as \"VideoType\","+
			"a.Video_Status__c as \"VideoStatus\","+
			"a.Future_1__c as \"FutureResult\" "+
			"from uwwsharedcrm.campaign_member_activity__c a, uwwsharedcrm.campaign c "+
			"where a.Campaign__c=c.sfid order by a.Id desc";
	} else if ( opt == 2 ) { //lookup campaign
		rtnSQL = "select sfid from uwwsharedcrm.campaign where sfid='";
	} else if ( opt == 3 ) { //lookup campaign
		rtnSQL = "select sfid from uwwsharedcrm.contact where acu_subscriber_key__c='";
	} else if ( opt == 4 ) { //lookup campaign
		rtnSQL = "select sfid from uwwsharedcrm.contact where email='";
	}
	//console.log("returning SQL: "+rtnSQL);
	return rtnSQL;
	
}

function postVideoResults(newCampaignDetail) {
	console.log("inside postVideoResults with activity: "+newCampaignDetail.Activity_Type__c);
	var sqlInsert = "insert into uwwsharedcrm.campaign_member_activity__c (";
	var sqlFields = "";
	var sqlValues = ") values (";
	var i = 0;
	
	for (var prop in newCampaignDetail) {
	    if (newCampaignDetail.hasOwnProperty(prop) &&
	    	exclude_att.indexOf(prop) < 0) {
	    	console.log("is "+prop+" in "+
	    			exclude_att+" ("+exclude_att.indexOf(prop)+")");
	    	if ( i++ > 0 ) {
	    		sqlFields += ",";
	    		sqlValues += ",";
	    	}
	    	sqlFields += prop;
	    	sqlValues += "'" + newCampaignDetail[prop] + "'";
	        console.log(prop +"-->"+newCampaignDetail[prop]);
	    }
	}
	console.log("sql to execute: "+sqlInsert+sqlFields+sqlValues+")");
	return sqlInsert+sqlFields+sqlValues+")";    
    //pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    /*pg.client.query(sqlInsert+sqlFields+sqlValues+")", function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err+"<table><tr><td>datebase   url</td><td>"+process.env.DATABASE_URL+"</td></tr>"+
                                                          "<tr><td>sql statement:</td><td>"+sqlInsert+sqlFields+sqlValues+")"+"</td></tr></table>"); }
      else
       { 
	    response.send(200);
     	//response.render('pages/db', {results: result.rows} );
       }
    //});
  });*/
}

function performValidations(body) {
	var rtnErrors="";
	console.log("performValidations: body: "+JSON.stringify(body));
	//console.log("performValidations: body.FirstName: "+body.FirstName.length);
	if (!(body.FirstName)) {
		rtnErrors+= "Error:\tMust provide a first name.\n";
	}
	if ((body.FirstName && body.FirstName.length <=0)) {
		rtnErrors+= "Error:\tMust provide a first name.\n";
	}
	if (!(body.LastName)) {
		rtnErrors+= "Error:\tMust provide a last name.\n";
	}
	if ((body.LastName && body.LastName.length <= 0)) {
		rtnErrors+= "Error:\tMust provide a last name.\n";
	}
	if (!(body.email)) {
		rtnErrors+= "Error:\tMust provide an email address.\n";
	}
	if ((body.email && body.email.length <= 0)) {
		rtnErrors+= "Error:\tMust provide an email address.\n";
	}
	if (!(body.PostalCode)) {
		rtnErrors+= "Error:\tMust provide a postal code.\n";
	}
	if ((body.PostalCode && body.PostalCode.length <= 0)) {
		rtnErrors+= "Error:\tMust provide a postal code.\n";
	}
	return rtnErrors;
}

function campaignExists (body) {
  var sSQL = buildQuery(2)+body.Campaign__c+"'";
  var rtnResults = "false";
  console.log("campaignExists: executing query: "+sSQL);
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query(sSQL, function(err, result) {
      done();
      if (err) { 
      	console.error(err); 
      } else { 
		rtnResults = "true";
       	console.log ("1-rows: "+JSON.stringify(result.rows)+" setting true");
	  }
    });
  });
  return rtnResults;
}

function displayObject(rows) {
	console.log("How many rows: "+Object.keys(rows).length);
	for (var row in rows) {
	    if (rows.hasOwnProperty(row)) {
	    	/*if ( i++ > 0 ) {
	    		sqlFields += ",";
	    		sqlValues += ",";
	    	}
	    	sqlFields += prop;
	    	sqlValues += "'" + newCampaignDetail[prop] + "'";*/
			console.log("How many columns: "+Object.keys(row).length);
	        console.log("2-"+row +"-->"+rows[row]);
	        for (var col in row) {
	        	if (row.hasOwnProperty(col)) {
	        		console.log("\t3-"+col+"-->"+row[col]);
	        	}
	        }
	    }
	}    
}


