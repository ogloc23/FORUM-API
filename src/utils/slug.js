import slugify from 'slugify';

const generateSlug = (title) => {
  return slugify(title, { lower: true, strict: true }); // Custom slug generation
};

export default generateSlug;
