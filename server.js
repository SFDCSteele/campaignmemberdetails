var pg = require('pg');
var cool = require('cool-ascii-faces');
var express = require('express');
var path = require("path");
//var bodyParser = require("body-parser");
//var mongodb = require("mongodb");
//var ObjectID = mongodb.ObjectID;

var CONTACTS_COLLECTION = "contacts";

var app = express();
app.use(express.static(__dirname + "/public"));
//app.use(bodyParser.json());

// Connect to the database before starting the application server. 
// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
pg.defaults.ssl = true;


// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
/*var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});
*/
// CONTACTS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

/*
        <td><%= r.id %></td>
        <td><%= r.campaignid %></td>
        <td><%= r.contactId %></td>
        <td><%= r.leadId %></td>
        <td><%= r.leadsource %></td>
        <td><%= r.UTMSource %></td>
        <td><%= r.luwId %></td>
        <td><%= r.subscriberKey %></td>
        <td><%= r.recordType %></td>
        <td><%= r.recordName %></td>
        <td><%= r.recordResults %></td>
app.get('/campaigndetails', function (request, response) {
*/
app.get('/', function (request, response) {
	console.log("Database: "+process.env.DATABASE_URL);
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT id,sfid,name FROM uwwsharedcrm.campaign_member_activity__c', 
    function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err+"<table><tr><td>datebase   url</td><td>"+process.env.DATABASE_URL+"</td></tr>"+
                                                          "<tr><td>database 1 url:</td><td>"+dburl_1+"</td></tr>"+
                                                          "<tr><td>database 2 url:</td><td>"+dburl_2+"</td></tr></table>"); }
      else
       { 
       		console.log("results: "+result.rows);
       		response.render('pages/db', {results: result.rows} ); 
       }
    });
  });
})


app.post('/campaigndetails', function (request, response) {
	var newCampaignDetail = request.body;
	var sqlInsert = "insert into campaign_details (";
	var sqlFields = "";
	var sqlValues = ") values (";
	var i = 0;
	
	for (var prop in newCampaignDetail) {
	    if (newCampaignDetail.hasOwnProperty(prop)) {
	    	if ( i++ > 0 ) {
	    		sqlFields += ",";
	    		sqlValues += ",";
	    	}
	    	sqlFields += prop;
	    	sqlValues += "'" + newCampaignDetail[prop] + "'";
	        console.log(prop +"-->"+newCampaignDetail[prop]);
	    }
	}    
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query(sqlInsert+sqlFields+sqlValues+")", function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err+"<table><tr><td>datebase   url</td><td>"+process.env.DATABASE_URL+"</td></tr>"+
                                                          "<tr><td>sql statement:</td><td>"+sqlInsert+sqlFields+sqlValues+")"+"</td></tr></table>"); }
      else
       { 
	    response.send(200);
     	//response.render('pages/db', {results: result.rows} );
       }
    });
  });
})


/*  "/contacts"
 *    GET: finds all contacts
 *    POST: creates a new contact
 */
/*
app.get("/contacts", function(req, res) {
  db.collection(CONTACTS_COLLECTION).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get contacts.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.post("/contacts", function(req, res) {
  var newContact = req.body;
  newContact.createDate = new Date();

  if (!(req.body.firstName || req.body.lastName)) {
    handleError(res, "Invalid user input", "Must provide a first or last name.", 400);
  }

  db.collection(CONTACTS_COLLECTION).insertOne(newContact, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new contact.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});
*/
/*  "/contacts/:id"
 *    GET: find contact by id
 *    PUT: update contact by id
 *    DELETE: deletes contact by id
 */
/*
app.get("/contacts/:id", function(req, res) {
  db.collection(CONTACTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get contact");
    } else {
      res.status(200).json(doc);
    }
  });
});

app.put("/contacts/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(CONTACTS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update contact");
    } else {
      res.status(204).end();
    }
  });
});

app.delete("/contacts/:id", function(req, res) {
  db.collection(CONTACTS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete contact");
    } else {
      res.status(204).end();
    }
  });
});
*/
//curl -H "Content-Type: application/json" -d '{"firstName":"Chris", "lastName": "Chang", "email": "support@mlab.com"}' https://campaignmemberdetails.herokuapp.com/contacts
//curl -H "Content-Type: application/json" -d '{"campaignid":"2001","contactid":"3001","leadid":"4001","leadsource":"testing","utmsource":"web","luwid":"5001","subscriberkey":"1234-6001","recordtype":"quiz","recordname":"mym phase 1","recordresults":"whatbringsjoy=kittens"}' https://campaignmemberdetails.herokuapp.com/campaigndetails
//curl -H "Content-Type: application/json" -d '{"id":10001,"campaignid":"2001","contactid":"3001","leadid":"4001","leadsource":"testing","utmsource":"web","luwid":"5001","subscriberkey":"1234-6001","recordtype":"quiz","recordname":"mym phase 1","recordresults":"whatbringsjoy=kittens"}' https://campaignmemberdetails.herokuapp.com/campaigndetails
