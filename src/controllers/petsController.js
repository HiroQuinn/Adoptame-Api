import { Pets } from "../models/Pets.js";
import { User } from "../models/User.js";
import { TypePet } from "../models/Typepet.js";
import { BreedPet } from "../models/Breedpet.js";
import { ColorPet } from "../models/Colorpet.js";
import { deleteFile } from "../middlewares/cloudinary.js";
import {
  findAllPets,
  findByPkPets,
  findByUser,
  findByFoundation,
} from "../models/Views/pets.views.js";
import { favouritePetsByUser } from "../controllers/favouriteController.js";
import { faker } from "@faker-js/faker";
import { City } from "../models/City.js";
import { Country } from "../models/Country.js";

export const getPetsById = async (req, res) => {
  // #swagger.tags = ['PETS']
  try {
    const { petId } = req.params;

    if (petId) {
      const detailPet = await findByPkPets(petId);
      return res.status(200).json(detailPet);
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPetsByIdUser = async (req, res) => {
  // #swagger.tags = ['PETS']
  try {
    const { userId } = req.params;
    const petsByUserId = await findByUser(userId);
    return res.status(200).json(petsByUserId);
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: error.message });
  }
};

export const getAllPets = async (req, res) => {
  // #swagger.tags = ['PETS']
  try {
    const { userId } = req.query;

    if (userId) {
      const allPets = await findAllPets();
      const favouritePetsbyUser = await favouritePetsByUser(userId);

      const mergeAllAndFavouritePets = [...allPets, ...favouritePetsbyUser];

      const set = new Set();
      const uniquePets = mergeAllAndFavouritePets.filter((pet) => {
        const alreadyHas = set.has(pet.id);
        set.add(pet.id);
        return !alreadyHas;
      });

      const idFavourites = favouritePetsbyUser.map((pet) => pet.id);

      const allAndFavouritePets = uniquePets.map((pet) => {
        if (idFavourites.includes(pet.id)) {
          pet.isFavourite = true;
        }
        return pet;
      });
      return res.status(200).json(allAndFavouritePets);
    }
    const allPets = await findAllPets();
    return res.status(200).json(allPets);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPetsFoundation = async (req, res) => {
  // #swagger.tags = ['PETS']
  try {
    /* const { idFundation } = req.params; */

    /* if (idFundation) { */
    const detailPet = await findByFoundation();
    return res.status(200).json(detailPet);
    /* } */
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createPets = async (req, res) => {
  /*
  #swagger.tags = ['PETS']
  #swagger.consumes = ['multipart/form-data']  
  #swagger.parameters['photos'] = {
      in: 'formData',
      type: 'file',
      required: 'false',
      description: 'Selecciona una foto',
      collectionFormat: 'multi',
      items: { type: 'file' }
  }
  #swagger.parameters['body'] = {
      in: 'body',
      description: 'Some description...',
      schema: {
        name: "user_test",
        typeId: "dog",
        breedId: 2,
        coat: "short",
        specialCares: false,
        castrated: false,
        gender: "male",
        environment: {"children": true,"dogs": null,"cats": null},
        tags: ["friendly", "affectionate"],
        size: "medium",
        color: "marron",
        age: "young",
        health: "vaccinations up to date",
        description: "happy dog",
        userId: 1
      }
  }
  */

  const images = req?.files?.length ? req.files.map((image) => image.path) : [];
  const idFiles = req?.files?.length
    ? req.files.map((img) =>
        img.filename.slice(img.filename.lastIndexOf("/") + 1)
      )
    : [];
  try {
    const { data } = req.body;
    const infoPets = data ? JSON.parse(req.body?.data) : req.body;
    const {
      name,
      typeId,
      breedId,
      colorId,
      age,
      gender,
      size,
      coat,
      health,
      description,
      tags,
      castrated,
      attributes,
      environment,
      userId,
    } = infoPets;

    const user = await User.findByPk(userId);
    const type = await TypePet.findByPk(typeId);
    const breed = await BreedPet.findByPk(breedId);
    const color = await ColorPet.findByPk(colorId);

    // Traer imagenes random
    let resultPhotos = faker.datatype.number({ min: 1, max: 5 });
    let photosCats = [];
    for (let index = 0; index < resultPhotos; index++) {
      photosCats.push(faker.image.cats());
    }

    if (user) {
      const newPet = await Pets.create({
        name,
        age,
        gender,
        size,
        coat,
        health,
        description,
        tags,
        castrated:
          typeof castrated === "boolean" ? castrated : castrated == "true",
        attributes:
          typeof attributes === "object"
            ? JSON.stringify(attributes)
            : attributes,
        environment:
          typeof environment === "object"
            ? JSON.stringify(environment)
            : environment,
        photos: images,
      });

      // dependencies
      await newPet.setUser(user);
      await newPet.setTypepet(type);
      await newPet.setBreedpet(breed);
      await newPet.setColorpet(color);

      const detailPetCreated = await findByPkPets(newPet.id);
      return res
        .status(201)
        .json({ data: detailPetCreated, message: "successfully created pet" });
    }
    idFiles.forEach((idFile) => {
      deleteFile(idFile);
    });
    return res.status(400).json({ message: "user invalid" });
  } catch (error) {
    idFiles.forEach((idFile) => {
      deleteFile(idFile);
    });
    console.log(error);
    return res.status(400).json({ message: error.message });
  }
};

export const updatePets = async (req, res) => {
  // #swagger.tags = ['PETS']
  const imageUploadUrls = req?.files?.length
    ? req.files.map((image) => image.path)
    : [];
  const idUploadImages = req?.files?.length
    ? req.files.map((img) =>
        img.filename.slice(img.filename.lastIndexOf("/") + 1)
      )
    : [];
  try {
    const { data } = req.body;
    const { petId } = req.params;
    const infoPets = data ? JSON.parse(req.body?.data) : req.body;
    const {
      name,
      typeId,
      breedId,
      coat,
      specialCares,
      castrated,
      gender,
      environment,
      tags,
      size,
      age,
      health,
      description,
      status,
      urlPhotosDb,
      colorId,
      attributes,
    } = infoPets;

    const pet = await Pets.findByPk(petId);
    const breed = await BreedPet.findByPk(breedId);
    const type = await TypePet.findByPk(typeId);
    const color = await ColorPet.findByPk(colorId);

    const urlsDb = urlPhotosDb === "" ? [] : urlPhotosDb;

    if (pet && pet.status === "adoptable") {
      const differenceUrlsDb = pet.photos.filter(
        (url) => !urlsDb.includes(url)
      );

      const urlPhotosDb = differenceUrlsDb.map((url) =>
        url.slice(url.lastIndexOf("/") + 1)
      ); // [idImage.jpg]

      const idImagesDb = urlPhotosDb.map((nameImage) =>
        nameImage.slice(0, nameImage.indexOf("."))
      ); // [idImage]

      idImagesDb.length &&
        idImagesDb.forEach((idFile) => {
          deleteFile(idFile);
        });

      const petUpdated = await Pets.update(
        {
          name,
          coat,
          specialCares:
            typeof specialCares === "boolean"
              ? specialCares
              : specialCares == "true",
          castrated:
            typeof castrated === "boolean" ? castrated : castrated == "true",
          gender,
          environment:
            typeof environment === "object"
              ? JSON.stringify(environment)
              : environment,
          tags,
          size,
          color,
          age,
          health,
          description,
          photos: urlsDb.concat(imageUploadUrls),
          status,
          attributes:
            typeof attributes === "object"
              ? JSON.stringify(attributes)
              : attributes,
        },
        {
          where: {
            id: petId,
          },
          returning: true,
          plain: true,
        }
      );

      await pet.setTypepet(type);
      await pet.setBreedpet(breed);

      petUpdated[1].dataValues.environment = JSON.parse(
        petUpdated[1].dataValues.environment
      );
      const detailPetUpdated = await findByPkPets(petUpdated[1].dataValues.id);
      return res
        .status(201)
        .json({ data: detailPetUpdated, message: "successfully updated pet" });
    }

    imageUploadUrls.length &&
      idUploadImages.forEach((idFile) => {
        deleteFile(idFile);
      });

    return res.status(400).json({ message: "pet invalid" });
  } catch (error) {
    imageUploadUrls.length &&
      idUploadImages.forEach((idFile) => {
        deleteFile(idFile);
      });
    return res.status(400).json({ message: error.message });
  }
};

export const deletePets = async (req, res) => {
  // #swagger.tags = ['PETS']
  try {
    const { petId } = req.params;
    const pet = await Pets.findByPk(petId);
    if (pet) {
      await Pets.update(
        {
          status: "adopted",
        },
        {
          where: {
            id: petId,
          },
        }
      );
      return res.status(200).json({ message: "successfully removed" });
    }
    return res.status(400).json({ message: "pet invalid" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Funtion get city
export const findCity = async (name) => {
  const cities = await City.findAll({
    attributes: ["name"],
  });
  const cityName = cities.filter(
    (city) => city.name.toLowerCase() === name.toLowerCase()
  );
  return cityName;
};
//Route get pets by city
export const findPetsByCity = async (req, res) => {
  // #swagger.tags = ['PETS']
  const { city, userId } = req.query;
  console.log(userId);
  try {
    const cityName = await findCity(city);
    // const pets = await findAllPets();
    if (userId) {
      const allPets = await findAllPets();
      const filteredPets = allPets.filter(
        (pet) =>
          pet.contact.address.city.toLowerCase() ===
          cityName[0].name.toLowerCase()
      );
      const favouritePetsbyUser = await favouritePetsByUser(userId);

      const mergeAllAndFavouritePets = [
        ...filteredPets,
        ...favouritePetsbyUser,
      ];

      const set = new Set();
      const uniquePets = mergeAllAndFavouritePets.filter((pet) => {
        const alreadyHas = set.has(pet.id);
        set.add(pet.id);
        return !alreadyHas;
      });

      const idFavourites = favouritePetsbyUser.map((pet) => pet.id);

      const allAndFavouritePets = uniquePets.map((pet) => {
        if (idFavourites.includes(pet.id)) {
          pet.isFavourite = true;
        }
        return pet;
      });
      return res.status(200).json(allAndFavouritePets);
    }

    // const pets = await Pets.findAll({where:  })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
};

// Funtion get Country
export const findCountry = async (name) => {
  const countries = await Country.findAll({
    attributes: ["name", "id"],
  });
  const countryName = countries.filter(
    (country) => country.name.toLowerCase() === name.toLowerCase()
  );
  return countryName;
};

//Route find Pets by Country
export const findPetsByCountry = async (req, res) => {
  // #swagger.tags = ['PETS']

  const { country, userId } = req.query;
  const countryName = await findCountry(country);
  // const allPets = await findAllPets();

  try {
    if (userId) {
      const allPets = await findAllPets();
      const filteredPets = allPets.filter(
        (pet) =>
          pet.contact.address.country.toLowerCase() ===
          countryName[0].id.toLowerCase()
      );
      const favouritePetsbyUser = await favouritePetsByUser(userId);

      const mergeAllAndFavouritePets = [
        ...filteredPets,
        ...favouritePetsbyUser,
      ];

      const set = new Set();
      const uniquePets = mergeAllAndFavouritePets.filter((pet) => {
        const alreadyHas = set.has(pet.id);
        set.add(pet.id);
        return !alreadyHas;
      });

      const idFavourites = favouritePetsbyUser.map((pet) => pet.id);

      const allAndFavouritePets = uniquePets.map((pet) => {
        if (idFavourites.includes(pet.id)) {
          pet.isFavourite = true;
        }
        return pet;
      });
      return res.status(200).json(allAndFavouritePets);
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
};
