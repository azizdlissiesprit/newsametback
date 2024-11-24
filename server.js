const mongoose = require('mongoose');
const express = require('express');
const app = express();
const cors = require('cors');
const PORT = 3001;
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const shell = require('shelljs');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());

// MongoDB connection string
const mongoURI = "mongodb+srv://ecommerce:ecommerce1@cluster0.du9aiso.mongodb.net/samet-data?retryWrites=true&w=majority&appName=samet-data";

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB!');
  // Start the server only after the connection is established
  app.listen(PORT, () => {
    console.log('Server started on port 3001');
  });
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Define a schema for products
const optionSchema = new mongoose.Schema({
  typeOption: String,
  nomOption: String,
  sizesOptions: [String],
  customOptions:[{
    name: String,
    prix: String,
  }],
  singleOptionPrice : String // Correct way to define an array of strings
});
const Option = mongoose.model('options', optionSchema);

const validationSchema = new mongoose.Schema({
  productID: String,
  productName: String,
  options:[{
    name: String,
    prix: String,
  }],
  quantity: String,
  dateOfOrder: String,
  clientName: String,
  totalPrice: String
});
const Validation = mongoose.model('validations', validationSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  addProduct: { type: Boolean, default: false },
  modifyProduct: { type: Boolean, default: false },
  accessProductList: { type: Boolean, default: false },
  accessAnalytics: { type: Boolean, default: false },
  manageCategories: { type: Boolean, default: false },
  validateOrders: { type: Boolean, default: false },
  addHyperPoints: { type: Boolean, default: false },
});
const User = mongoose.model('users', userSchema);


const productSchema = new mongoose.Schema({
  idProd: String,
  typeProd: String,
  nom: String,
  description: String,
  quantite: String,
  images: [{
    _id: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId() }, // Unique image ID
    img: String,
    hyperPoints: [{
      produitID: String,
      posX: String,
      posY: String
    }]
  }],
  minPrice: String,
  maxPrice: String,
  longueur: String,
  largeur: String,
  hauteur: String,
  profondeur_assise: String,
  declinaison: { type: String, default: "oui" },  
  display: { type: String, default: "oui" },
  categorie: { type: [String], default: ["nondecide"] },
  disponibilite: { type: String, default: "stock" },  
  options : [{
    option_name: String,
    prix_option: String,
    
  }],
  sizes : [{
    longueur: String,
    largeur: String,
    prix_option:String,
    prix_coffre:String,

  }],
  mousse : [{
    mousse_name: String,
    mousse_prix: String,


  }]


});
const Product = mongoose.model('produits', productSchema);
const categorieSchema = new mongoose.Schema({
  maincat: String,
  hiddenCat :String,
  subcats: [{
    subcat: String,
    hiddenSubCat: String
  }] // Array of strings
});
// Create a model from the schema
const Categorie = mongoose.model('categories', categorieSchema);

// POST API to add a new product

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir); // Create directory if it doesn't exist
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Ensure directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
// Initialize multer with the defined storage configuration
const upload = multer({ storage: storage });
app.post('/api/users/add-user', async (req, res) => {
  const { username, password, rights } = req.body;

  try {
    // Create a new user instance
    const newUser = new User({
      username,
      password,  // You should hash the password before saving it in a real application
      ...rights, // Add the rights (checkbox values)
    });

    // Save the new user to the database
    await newUser.save();

    // Send success response
    res.status(201).json({ message: 'User created successfully!', user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

app.put("/api/categories/rename-subcategory/:id", async (req, res) => {
  const { id } = req.params;
  const { oldName, newName } = req.body;

  if (!oldName || !newName || newName.trim() === "") {
    return res.status(400).json({ error: "Old and new subcategory names are required." });
  }

  try {
    const category = await Categorie.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }

    const subcatIndex = category.subcats.indexOf(oldName);
    if (subcatIndex === -1) {
      return res.status(404).json({ error: "Subcategory not found." });
    }

    // Rename the subcategory
    category.subcats[subcatIndex] = newName.trim();
    await category.save();

    res.status(200).json({ success: true, message: "Subcategory renamed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to rename subcategory." });
  }
});
app.post('/api/upload-images', upload.array('images'), (req, res) => {
  try {
    console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
    const uploadedFiles = req.files.map(file => file.path); // Get paths of the uploaded files
    console.log('Uploaded files:', uploadedFiles);
    res.status(200).json({ message: 'Images uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.log(xx);
    console.log(error);
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
});
app.put('/api/categories/hide-category/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  const { hiddenCat } = req.body; // Expect the new "hiddenCat" value ("yes" or "no")

  if (!hiddenCat) {
    return res.status(400).json({ error: 'Hidden category value is required' });
  }

  try {
    const updatedCategory = await Categorie.findByIdAndUpdate(
      categoryId,
      { hiddenCat }, // Update the hiddenCat field
      { new: true } // Return the updated category
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update category visibility' });
  }
});
app.put('/api/categories/hide-subcategory/:categoryId/:subcatName', async (req, res) => {
  const { categoryId, subcatName } = req.params;
  const { hiddenSubCat } = req.body; // Expect the new "hiddenSubCat" value ("yes" or "no")

  if (!hiddenSubCat) {
    return res.status(400).json({ error: 'Hidden subcategory value is required' });
  }

  try {
    // Find the category and update the specific subcategory's hiddenSubCat value
    const updatedCategory = await Categorie.findOneAndUpdate(
      { _id: categoryId, "subcats.subcat": subcatName },
      { $set: { "subcats.$.hiddenSubCat": hiddenSubCat } }, // Update the hiddenSubCat value of the specific subcategory
      { new: true } // Return the updated category
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category or subcategory not found' });
    }

    res.status(200).json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update subcategory visibility' });
  }
});

app.post('/api/addcategories', async (req, res) => {
  const maincat  = req.body.name;
  console.log(maincat);
  // Validate the input
  if (!maincat || typeof maincat !== 'string' || maincat.trim() === '') {
    return res.status(400).json({ error: 'Main category name is required and must be a valid string.' });
  }

  try {
    // Check if the category already exists
    const existingCategory = await Categorie.findOne({ maincat: maincat.trim() });
    if (existingCategory) {
      return res.status(409).json({ error: 'Category already exists.' });
    }

    // Create a new category document
    const newCategory = new Categorie({
      maincat: maincat.trim(),
      hiddenCat :"no",
      subcats: [] // Initialize with an empty array of subcategories
    });

    // Save the document to the database
    await newCategory.save();

    return res.status(201).json({
      message: 'Category added successfully!',
      category: newCategory
    });
  } catch (error) {
    console.error('Error adding category:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});
app.delete('/api/categories/:categoryId/subcategories/:subcategory', async (req, res) => {
  const { categoryId, subcategory } = req.params;

  try {
    const category = await Categorie.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Remove the subcategory from the subcats array
    const updatedSubcats = category.subcats.filter(sub => sub !== subcategory);
    category.subcats = updatedSubcats;

    await category.save(); // Save the updated category
    res.status(200).json({ message: 'Subcategory deleted successfully', category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
});
app.put("/api/categories/rename/:id", async (req, res) => {
  const { id } = req.params;
  const { newName } = req.body;

  if (!newName || newName.trim() === "") {
    return res.status(400).json({ error: "New category name is required." });
  }

  try {
    const category = await Categorie.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }

    category.maincat = newName.trim();
    await category.save();

    res.status(200).json({ success: true, message: "Category renamed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to rename category." });
  }
});
app.post('/api/products/update-hyperpoints', async (req, res) => {
  const { idProd, clickpos } = req.body;

  try {
    // Find the product by idProd
    let product = await Product.findOne({ idProd });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log("xxX",clickpos);
    product.images.forEach((image, index) => {
      // Filter the clickpos array to find matching indices
      const matchingClicks = clickpos.filter(click => click.index === index);

      // If there are matching click positions, add them to the hyperPoints array
      matchingClicks.forEach(click => {
          image.hyperPoints.push({
              produitID: click.idp,
              posX: click.x,
              posY: click.y
          });
      });
  });
    // Save the updated product
    await product.save();

    return res.json({ message: 'Hyperpoints updated successfully', product });
  } catch (error) {
    console.error('Error updating product hyperpoints:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
});
app.get('/api/getoptions', async (req, res) => {
  try {
    const options = await Option.find();
    console.log(options); // Fetch all options from the database
    res.status(200).json(options);
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ message: 'Failed to fetch options.' });
  }
});
app.post('/api/options', async (req, res) => {
  try {
    
    // Destructure the required fields from the request body
    const { nomOption, typeOption, customOptions, singleOptionPrice,sizesOptions } = req.body;
    // Validate input
    if (!nomOption || !typeOption) {
      return res.status(400).json({ message: 'Invalid input data. "nomOption" and "typeOption" are required.' });
    }

    // Create the base option data
    const newOption = new Option({
      nomOption,
      typeOption,
    });

    // Add `customOptions` if provided and valid
    if (Array.isArray(customOptions)) {
      newOption.customOptions = customOptions.map((option) => ({
        name: option.name,
        prix: option.prix,
      }));
    }
    if (Array.isArray(sizesOptions)) {
      sizesOptions.forEach((size) => {
        newOption.sizesOptions.push(size.price);  // Just pushing the price values, as per your schema
      });
    }

    // Add `singleOptionPrice` if provided
    if (singleOptionPrice) {
      newOption.singleOptionPrice = singleOptionPrice;
    }

    // Save the option to MongoDB
    const savedOption = await newOption.save();

    // Respond with the saved option
    res.status(201).json(savedOption);
  } catch (error) {
    console.error('Error saving option:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/products', async (req, res) => {
  const declinaison = req.body.declinaison || "oui"; 
  const display = req.body.display || "non";;
  const { categories,description,disponibilite,hauteur,idproduit,images,largeur,longeur,mousse,nomproduit,prices,prixmax,prixmin,profondeur,quantity,sizes,typeproduit
  } = req.body;
  console.log(req.body);
  // Create a new product without hyperPoints but with unique IDs for images
  const newProduct = new Product({
    idProd:idproduit,
    typeProd:typeproduit,
    nom:nomproduit,
    description:description,
    quantite:quantity,
    images: images.map(image => ({
      _id: new mongoose.Types.ObjectId(), // Generate a unique _id for each image
      img: image
    })),
    minPrice:prixmin,
    maxPrice:prixmax,
    longueur:longeur,
    largeur:largeur,
    hauteur:hauteur,
    profondeur_assise:profondeur,
    declinaison,
    display,
    categorie:categories,
    disponibilite:disponibilite,
    options: prices,
    sizes:sizes,
    mousse:mousse,

  });

  try {
    // Save the product to MongoDB
    const savedProduct = await newProduct.save();

  } catch (error) {

    console.error('Error saving product:', error);
    res.status(500).json({ message: 'Server Error' });
  }
  

});
app.delete('/api/delcategories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Find and delete the category by ID
    const deletedCategory = await Categorie.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted successfully', deletedCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
app.patch('/api/categories/:id/subcategories', async (req, res) => {
  const { id } = req.params; // Category ID
  const { subcat } = req.body; // New subcategory name

  if (!subcat) {
    return res.status(400).json({ error: 'Subcategory name is required' });
  }

  try {
    const newSubcategory = { subcat, hiddenSubCat: "no" };
    // Find the category by ID and update its subcats array
    const updatedCategory = await Categorie.findByIdAndUpdate(
      id,
      { $push: { subcats: newSubcategory } }, // Add subcategory to the array
      { new: true } // Return the updated document
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add subcategory' });
  }
});
app.put('/api/categories/remove-subcategory/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  const { subcatName } = req.body;

  if (!subcatName) {
    return res.status(400).json({ error: 'Subcategory name is required.' });
  }

  try {
    const updatedCategory = await Categorie.findByIdAndUpdate(
      categoryId,
      { $pull: { subcats: { subcat: subcatName } } }, // Remove subcategory by name
      { new: true } // Return the updated document
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.status(200).json({ success: 'Subcategory removed successfully.', updatedCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove subcategory.' });
  }
});


app.patch('/api/categories/:categoryId/subcategories/:subcategoryId', async (req, res) => {
  const { categoryId, subcategoryId } = req.params;
  const { newSubcatName } = req.body;

  if (!newSubcatName) {
    return res.status(400).json({ error: 'New subcategory name is required' });
  }

  try {
    const updatedCategory = await Categorie.findOneAndUpdate(
      { _id: categoryId, "subcats._id": subcategoryId },
      { $set: { "subcats.$.subcat": newSubcatName } },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category or subcategory not found' });
    }

    res.status(200).json(updatedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to rename subcategory' });
  }
});




app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Categorie.find({});
    res.json(categories);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server Error');
  }
});
app.get('/get-products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server Error');
  }
});


// Update product by adding hyperPoints to a specific image
app.put('/api/products/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = req.params;
  const { hyperPoints } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the specific image by imageId
    const image = product.images.find(img => img._id.toString() === imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Update the hyperPoints for the specific image
    image.hyperPoints = hyperPoints;

    // Save the updated product
    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Error updating product image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});