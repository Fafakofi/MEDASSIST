const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// TODO: implement dashboard routes
router.get("/", (req, res) => res.json({ message: "dashboard endpoint — coming soon" }));

module.exports = router;
