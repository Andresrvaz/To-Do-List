//jshint esversion:6
require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const lodash = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-"+process.env.DB_ADMIN+":"+process.env.DB_CREDENTIALS+"@cluster0.v7thkg9.mongodb.net/tlistDB");

// defining item collection schema
const itemsSchema = new mongoose.Schema({
  name: String
});

//creating default items for item and list collection
const Item = mongoose.model("Item", itemsSchema);

const item0 = new Item({
  name: "Welcome to your todo-list"
});

const item1 = new Item({
  name: "Press + to add a new Item"
});

const item2 = new Item({
  name: "<----- Check to delete item"
});

const defaultItems = [item0, item1, item2];

//creating list schema for dynamic lists
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});


const List = mongoose.model("List", listSchema);


// Get handle for homepage
app.get("/", function(req, res) {

// model for populating home page list
    // model that find any item collection items
  Item.find({}, function(err, foundItems) {

    //if no items found inside items collection
    if (foundItems.length === 0) {
      //model for inserting default items created above
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Items added sucssesfully");
        }
      });
      // the redirect here is only in the chance of the first populate and
      // to prevent hanging or looping
      res.redirect("/");
    } else { //render is on the else side of the if preventing the site from hanging
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems
      });
    }
  });


});

app.post("/", function(req, res) {

  //This line of code prevents browswer favicon request to mess up.
  if (req.params.value === "favicon.ico") {
    return res.status(404)
  };

  // Save user new item
  const item = req.body.newItem;
  const list = req.body.list;

  const newItem = new Item({
    name: item
  });

  newItem.save();
// redirecting refresh page content to prevent from displaying an empty list and manual refresh
  res.redirect("/");

});

//This route will "catch" the submited action from the checkbox
app.post("/delete", function(req, res) {

  //this const will log the id from the checkbox tapping to item._id
  const itemDelete = req.body.cBox;

  //This mongoose function will search and delete the information contained in mongoDB
  Item.deleteOne({
    _id: itemDelete
  }, function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Deleted succesfully");
      res.redirect("/");
    }

  });
});

//this will handle any custom request for creating a new list
app.get("/:value", function(req, res) {
  const parameter = lodash.lowerCase(lodash.kebabCase(req.params.value));

  //This line of code prevents browswer favicon request to mess up.
  if (req.params.value === "favicon.ico") {
    return res.status(404)
  };



  //mongoose methods already have a forEach included in them
  // !var means logical not. it means variable equal to false.
// this method will search for the user input custom list
  List.findOne({
    name: parameter
  }, function(err, foundName) {
    if (!err) {
      //if no list found with given name will create one with defaultItems
      if (!foundName) {
        console.log(foundName + "this is found name");
        console.log("Doesn't exist");
        console.log("Creating new list");
        const list = new List({
          name: parameter,
          items: defaultItems
        });
        list.save().then(function(){; //method for saving new list. then method
        console.log("New List Created"); // verifies that save occurs before redirecting
        res.redirect("/" + parameter); //refreshing for custom list
      });
      }// if given custom list name equals to an existing list
       else if (parameter === foundName.name) {

        console.log(foundName.name + ' this is found name . name');
        console.log("match found");

        // check if list items are empty if they are it will add default items
        if (foundName.items.length === 0) {
          console.log("items are empty");
          List.updateMany({
            name: parameter
          },
          {
            items: defaultItems
          }, function(err) {
            if (err) {
              console.log(err);
            } else {
              console.log("Items added succesfully");
              res.redirect("/" + parameter); // refreshing to prevent hanging with empty list
            }
          });
        } else {
          // if list items not empty will render the page passing the list array to the ejs template
          List.find({
            name: foundName.name
          }, function(err, listFound) {
            if (err) {
              console.log(err);
            } else {
              res.render("dynamic", {
                listTitle: parameter,
                newListItems: listFound,
                parameter: parameter
              });
            }
          });
        }
      }
    }

  });

});

app.post("/delete/:value", function(req, res) {

  //tapping into the list where user is checking checkbox
  const dParameter = lodash.lowerCase(lodash.kebabCase(req.params.value));

  console.log(dParameter);

  // requesting checked item _id
  const itemDelete = req.body.cBox;

  //finding the id in the mongodb database
  List.findOne({
    name: dParameter
  }, function(err, foundList) {
    if (err) {
      console.log(err);
    } else {
      //another function that we could have implemented is
      //model.findOneAndUpdate ({name: foundList}, {$pull : {items: { id: itemDelete}}},callback);
      foundList.items.pull(itemDelete); //method for pulling the matched id item
      foundList.save(); //saving the new list with the deleted item
      res.redirect("/" + dParameter); // redirecting to prevent page hanging
    }
  });

});

app.post("/:value", function(req, res) {

  //This line of code prevents browswer favicon request to mess up.
  if (req.params.value === "favicon.ico") {
    return res.status(404)
  };

  //tapping into custom list name
  const postParameter = lodash.lowerCase(lodash.kebabCase(req.params.value));

  //tapping into user inputed data
  const item = req.body.newItem;

  //creating new item with user inputed data
  const newItem = new Item({
    name: item
  });

  //method for finding the list and then storing user given data
  List.findOne({
    name: postParameter
  }, function(err, foundList) {
    if (err) {
      console.log(err);
    } else {
      foundList.items.push(newItem); // pushing new item
      foundList.save();             // saving the new list with new item
      res.redirect("/" + postParameter); // redirect to prevent page from hanging with old data

    }
  });

});

// handle about request *not working*
app.get("/about", function(req, res) {
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started succesfully");
});
