//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/dbname", { useNewUrlParser: true, useUnifiedTopology: true });



const itemsSchema = {
  name: String,
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!",
});
const item2 = new Item({
  name: "Hit + to add new item.",
});
const item3 = new Item({
  name: "<-- Hit this to delete item.",
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: "String",
  items: [itemsSchema],
};
const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {
  Item.find({})
    .exec()
    .then((foundItems) => {
      if (foundItems.length === 0) {
        Item.insertMany(defaultItems);
        res.redirect("/");
      } else {
        res.render("list", { listTitle: "Today", newListItems: foundItems });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("An error occurred while retrieving items");
    });
});

app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({ name: customListName });
    if (foundList) {
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    } else {
      console.log("List does not exist");
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      list.save();
      res.redirect("/" + customListName);
    }
  } catch (error) {
    console.error("Error occurred: ", error);
    res.status(500).send("Internal server error");
  }
});

app.post("/", async (req, res) => {
  const { newItem: itemName, list: listName } = req.body;

  try {
    if (!itemName) {
      throw new Error("Item name cannot be empty");
    }

    const item = new Item({ name: itemName });

    if (listName === "Today") {
      await item.save();
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });

      if (!foundList) {
        throw new Error("List not found");
      }

      foundList.items.push(item);
      await foundList.save();
      res.redirect(`/${listName}`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});


app.post("/delete", async (req, res) => {
  const { checkbox: checkedItemId, listName } = req.body;

  try {
    if (!checkedItemId) {
      throw new Error("No item selected for deletion");
    }

    if (listName === "Today") {
      await Item.findByIdAndRemove(checkedItemId);
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    } else {
      const foundList = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } }
      );

      if (!foundList) {
        throw new Error("List not found");
      }

      res.redirect(`/${listName}`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});


app.get("/about", function (req, res) {
  res.render("about");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log("Server started on port " + PORT);
});