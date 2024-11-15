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
  subcats: [String] // Array of strings
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








app.get('/get-categories', async (req, res) => {
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