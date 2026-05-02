const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');

// GET /api/organizations
// List all organizations (public - for users to pick which queue to join)
router.get('/', async (req, res) => {
  try {
    const organizations = await Organization.find().select('name slug createdAt').sort({ name: 1 });
    res.json(organizations);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ message: 'Server error fetching organizations' });
  }
});

// GET /api/organizations/:slug
// Get organization by slug
router.get('/:slug', async (req, res) => {
  try {
    const organization = await Organization.findOne({
      slug: req.params.slug.toLowerCase(),
    }).select('name slug createdAt');

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ message: 'Server error fetching organization' });
  }
});

module.exports = router;
