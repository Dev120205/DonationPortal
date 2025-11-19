import path from "path";
import "dotenv/config";
import * as express from "express";
import express__default from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
const users = [
  {
    id: "admin1",
    name: "Admin User",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "donor1",
    name: "Donor User",
    email: "donor@example.com",
    password: "donor123",
    role: "donor",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "receiver1",
    name: "Receiver User",
    email: "receiver@example.com",
    password: "receiver123",
    role: "receiver",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
const generateToken = (userId, role) => {
  const payload = { userId, role, exp: Date.now() + 24 * 60 * 60 * 1e3 };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};
const validateToken = (token) => {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    if (payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
};
const findUserByEmail = (email) => {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
};
const findUserById = (id) => {
  return users.find((user) => user.id === id);
};
const handleRegister = (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      const response2 = {
        success: false,
        message: "All fields are required."
      };
      return res.status(400).json(response2);
    }
    if (!["donor", "receiver", "admin"].includes(role)) {
      const response2 = {
        success: false,
        message: "Invalid role specified."
      };
      return res.status(400).json(response2);
    }
    if (findUserByEmail(email)) {
      const response2 = {
        success: false,
        message: "User with this email already exists."
      };
      return res.status(409).json(response2);
    }
    const userId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      password,
      // In production, hash this password
      role,
      createdAt: now,
      updatedAt: now
    };
    users.push(newUser);
    const token = generateToken(userId, role);
    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };
    const response = {
      success: true,
      message: "Registration successful!",
      user: userResponse,
      token
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Registration error:", error);
    const response = {
      success: false,
      message: "Internal server error."
    };
    res.status(500).json(response);
  }
};
const handleLogin = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const response2 = {
        success: false,
        message: "Email and password are required."
      };
      return res.status(400).json(response2);
    }
    const user = findUserByEmail(email);
    if (!user) {
      const response2 = {
        success: false,
        message: "Invalid email or password."
      };
      return res.status(401).json(response2);
    }
    if (user.password !== password) {
      const response2 = {
        success: false,
        message: "Invalid email or password."
      };
      return res.status(401).json(response2);
    }
    const token = generateToken(user.id, user.role);
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    const response = {
      success: true,
      message: "Login successful!",
      user: userResponse,
      token
    };
    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    const response = {
      success: false,
      message: "Internal server error."
    };
    res.status(500).json(response);
  }
};
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required." });
  }
  const decoded = validateToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: "Invalid or expired token." });
  }
  req.user = { id: decoded.userId, role: decoded.role };
  next();
};
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions." });
    }
    next();
  };
};
const DATA_DIR = path.join(process.cwd(), "data");
const DONATIONS_CSV = path.join(DATA_DIR, "donations.csv");
const REQUESTS_CSV = path.join(DATA_DIR, "requests.csv");
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
function initializeCSVFiles() {
  ensureDataDirectory();
  if (!fs.existsSync(DONATIONS_CSV)) {
    const donationsHeader = "id,donorId,donorName,donorEmail,itemName,category,description,quantity,photoUrl,status,createdAt,updatedAt\n";
    fs.writeFileSync(DONATIONS_CSV, donationsHeader);
  }
  if (!fs.existsSync(REQUESTS_CSV)) {
    const requestsHeader = "id,receiverId,receiverName,receiverEmail,itemNeeded,category,description,quantity,urgency,status,createdAt,updatedAt\n";
    fs.writeFileSync(REQUESTS_CSV, requestsHeader);
  }
}
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
function objectToCSVRow(obj) {
  const values = Object.values(obj).map((value) => {
    if (value === null || value === void 0) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  });
  return values.join(",") + "\n";
}
function csvRowToObject(row, headers) {
  const values = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < row.length) {
    const char = row[i];
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
    i++;
  }
  values.push(current);
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = values[index] || "";
  });
  return obj;
}
function saveDonationToCSV(donation) {
  initializeCSVFiles();
  const csvRow = objectToCSVRow(donation);
  fs.appendFileSync(DONATIONS_CSV, csvRow);
}
function saveRequestToCSV(request) {
  initializeCSVFiles();
  const csvRow = objectToCSVRow(request);
  fs.appendFileSync(REQUESTS_CSV, csvRow);
}
function readDonationsFromCSV() {
  initializeCSVFiles();
  if (!fs.existsSync(DONATIONS_CSV)) {
    return [];
  }
  const csvContent = fs.readFileSync(DONATIONS_CSV, "utf-8");
  const lines = csvContent.trim().split("\n");
  if (lines.length <= 1) {
    return [];
  }
  const headers = lines[0].split(",");
  const donations = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      try {
        const donation = csvRowToObject(lines[i], headers);
        donation.quantity = parseInt(donation.quantity.toString()) || 0;
        donations.push(donation);
      } catch (error) {
        console.error("Error parsing donation row:", lines[i], error);
      }
    }
  }
  return donations;
}
function readRequestsFromCSV() {
  initializeCSVFiles();
  if (!fs.existsSync(REQUESTS_CSV)) {
    return [];
  }
  const csvContent = fs.readFileSync(REQUESTS_CSV, "utf-8");
  const lines = csvContent.trim().split("\n");
  if (lines.length <= 1) {
    return [];
  }
  const headers = lines[0].split(",");
  const requests = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      try {
        const request = csvRowToObject(lines[i], headers);
        request.quantity = parseInt(request.quantity.toString()) || 0;
        requests.push(request);
      } catch (error) {
        console.error("Error parsing request row:", lines[i], error);
      }
    }
  }
  return requests;
}
function updateDonationInCSV(donationId, updates) {
  const donations = readDonationsFromCSV();
  const index = donations.findIndex((d) => d.id === donationId);
  if (index === -1) {
    return false;
  }
  donations[index] = { ...donations[index], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  initializeCSVFiles();
  const header = "id,donorId,donorName,donorEmail,itemName,category,description,quantity,photoUrl,status,createdAt,updatedAt\n";
  let csvContent = header;
  donations.forEach((donation) => {
    csvContent += objectToCSVRow(donation);
  });
  fs.writeFileSync(DONATIONS_CSV, csvContent);
  return true;
}
function updateRequestInCSV(requestId, updates) {
  const requests = readRequestsFromCSV();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) {
    return false;
  }
  requests[index] = { ...requests[index], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  initializeCSVFiles();
  const header = "id,receiverId,receiverName,receiverEmail,itemNeeded,category,description,quantity,urgency,status,createdAt,updatedAt\n";
  let csvContent = header;
  requests.forEach((request) => {
    csvContent += objectToCSVRow(request);
  });
  fs.writeFileSync(REQUESTS_CSV, csvContent);
  return true;
}
function deleteDonationFromCSV(donationId) {
  const donations = readDonationsFromCSV();
  const filteredDonations = donations.filter((d) => d.id !== donationId);
  if (filteredDonations.length === donations.length) {
    return false;
  }
  initializeCSVFiles();
  const header = "id,donorId,donorName,donorEmail,itemName,category,description,quantity,photoUrl,status,createdAt,updatedAt\n";
  let csvContent = header;
  filteredDonations.forEach((donation) => {
    csvContent += objectToCSVRow(donation);
  });
  fs.writeFileSync(DONATIONS_CSV, csvContent);
  return true;
}
function deleteRequestFromCSV(requestId) {
  const requests = readRequestsFromCSV();
  const filteredRequests = requests.filter((r) => r.id !== requestId);
  if (filteredRequests.length === requests.length) {
    return false;
  }
  initializeCSVFiles();
  const header = "id,receiverId,receiverName,receiverEmail,itemNeeded,category,description,quantity,urgency,status,createdAt,updatedAt\n";
  let csvContent = header;
  filteredRequests.forEach((request) => {
    csvContent += objectToCSVRow(request);
  });
  fs.writeFileSync(REQUESTS_CSV, csvContent);
  return true;
}
const csvToApiDonation = (csvDonation) => ({
  id: csvDonation.id,
  donorId: csvDonation.donorId,
  itemName: csvDonation.itemName,
  category: csvDonation.category,
  description: csvDonation.description,
  quantity: csvDonation.quantity,
  photoUrl: csvDonation.photoUrl || void 0,
  status: csvDonation.status,
  createdAt: csvDonation.createdAt,
  updatedAt: csvDonation.updatedAt
});
const addDonation = (req, res) => {
  try {
    const { itemName, category, description, quantity, photoUrl } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!itemName || !category || !description) {
      const response2 = {
        success: false,
        message: "Item name, category, and description are required."
      };
      return res.status(400).json(response2);
    }
    if (!["clothes", "books", "food", "furniture", "electronics", "toys", "medical", "other"].includes(category)) {
      const response2 = {
        success: false,
        message: "Invalid category specified."
      };
      return res.status(400).json(response2);
    }
    if (quantity < 1) {
      const response2 = {
        success: false,
        message: "Quantity must be at least 1."
      };
      return res.status(400).json(response2);
    }
    const donor = findUserById(userId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const donationId = generateId();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const csvDonation = {
      id: donationId,
      donorId: userId,
      donorName: donor.name,
      donorEmail: donor.email,
      itemName,
      category,
      description,
      quantity: quantity || 1,
      photoUrl: photoUrl || "",
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    saveDonationToCSV(csvDonation);
    const apiDonation = csvToApiDonation(csvDonation);
    const response = {
      success: true,
      message: "Donation added successfully! It's pending admin approval.",
      donation: apiDonation
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Add donation error:", error);
    const response = {
      success: false,
      message: "Internal server error."
    };
    res.status(500).json(response);
  }
};
const getMyDonations = (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const allDonations = readDonationsFromCSV();
    const userDonations = allDonations.filter((donation) => donation.donorId === userId).map(csvToApiDonation);
    res.json({
      success: true,
      donations: userDonations
    });
  } catch (error) {
    console.error("Get my donations error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const updateDonation = (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, category, description, quantity, photoUrl } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const allDonations = readDonationsFromCSV();
    const donation = allDonations.find((d) => d.id === id);
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found." });
    }
    if (donation.donorId !== userId) {
      return res.status(403).json({ success: false, message: "You can only edit your own donations." });
    }
    if (donation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "You can only edit donations that are still pending approval."
      });
    }
    if (!itemName || !category || !description) {
      return res.status(400).json({
        success: false,
        message: "Item name, category, and description are required."
      });
    }
    const updates = {
      itemName,
      category,
      description,
      quantity: quantity || 1,
      photoUrl: photoUrl || "",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const success = updateDonationInCSV(id, updates);
    if (!success) {
      return res.status(404).json({ success: false, message: "Failed to update donation." });
    }
    const updatedDonations = readDonationsFromCSV();
    const updatedDonation = updatedDonations.find((d) => d.id === id);
    res.json({
      success: true,
      message: "Donation updated successfully.",
      donation: updatedDonation ? csvToApiDonation(updatedDonation) : null
    });
  } catch (error) {
    console.error("Update donation error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const deleteDonation = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const allDonations = readDonationsFromCSV();
    const donation = allDonations.find((d) => d.id === id);
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found." });
    }
    if (donation.donorId !== userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own donations." });
    }
    if (donation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "You can only delete donations that are still pending approval."
      });
    }
    const success = deleteDonationFromCSV(id);
    if (!success) {
      return res.status(404).json({ success: false, message: "Failed to delete donation." });
    }
    res.json({
      success: true,
      message: "Donation deleted successfully."
    });
  } catch (error) {
    console.error("Delete donation error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const getAllDonations = (req, res) => {
  try {
    const allDonations = readDonationsFromCSV();
    const donationsWithDonorInfo = allDonations.map((donation) => ({
      ...csvToApiDonation(donation),
      donorName: donation.donorName,
      donorEmail: donation.donorEmail
    }));
    const response = {
      success: true,
      donations: donationsWithDonorInfo
    };
    res.json(response);
  } catch (error) {
    console.error("Get all donations error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const approveDonation = (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'approve' or 'reject'."
      });
    }
    const allDonations = readDonationsFromCSV();
    const donation = allDonations.find((d) => d.id === id);
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found." });
    }
    if (donation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending donations can be approved or rejected."
      });
    }
    const updates = {
      status: action === "approve" ? "approved" : "rejected",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const success = updateDonationInCSV(id, updates);
    if (!success) {
      return res.status(404).json({ success: false, message: "Failed to update donation status." });
    }
    const response = {
      success: true,
      message: `Donation ${action}d successfully.`
    };
    res.json(response);
  } catch (error) {
    console.error("Approve donation error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const csvToApiRequest = (csvRequest) => ({
  id: csvRequest.id,
  receiverId: csvRequest.receiverId,
  itemNeeded: csvRequest.itemNeeded,
  category: csvRequest.category,
  description: csvRequest.description,
  quantity: csvRequest.quantity,
  urgency: csvRequest.urgency,
  status: csvRequest.status,
  createdAt: csvRequest.createdAt,
  updatedAt: csvRequest.updatedAt
});
const addRequest = (req, res) => {
  try {
    const { itemNeeded, category, description, quantity, urgency } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!itemNeeded || !category || !description) {
      const response2 = {
        success: false,
        message: "Item needed, category, and description are required."
      };
      return res.status(400).json(response2);
    }
    if (!["clothes", "books", "food", "furniture", "electronics", "toys", "medical", "other"].includes(category)) {
      const response2 = {
        success: false,
        message: "Invalid category specified."
      };
      return res.status(400).json(response2);
    }
    if (!["normal", "urgent"].includes(urgency)) {
      const response2 = {
        success: false,
        message: "Urgency must be either 'normal' or 'urgent'."
      };
      return res.status(400).json(response2);
    }
    if (quantity < 1) {
      const response2 = {
        success: false,
        message: "Quantity must be at least 1."
      };
      return res.status(400).json(response2);
    }
    const receiver = findUserById(userId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const requestId = generateId();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const csvRequest = {
      id: requestId,
      receiverId: userId,
      receiverName: receiver.name,
      receiverEmail: receiver.email,
      itemNeeded,
      category,
      description,
      quantity: quantity || 1,
      urgency,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    saveRequestToCSV(csvRequest);
    const apiRequest = csvToApiRequest(csvRequest);
    const response = {
      success: true,
      message: "Request posted successfully! It's pending admin approval.",
      request: apiRequest
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Add request error:", error);
    const response = {
      success: false,
      message: "Internal server error."
    };
    res.status(500).json(response);
  }
};
const getMyRequests = (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const allRequests = readRequestsFromCSV();
    const userRequests = allRequests.filter((request) => request.receiverId === userId).map(csvToApiRequest);
    res.json({
      success: true,
      requests: userRequests
    });
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const updateRequest = (req, res) => {
  try {
    const { id } = req.params;
    const { itemNeeded, category, description, quantity, urgency } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const allRequests = readRequestsFromCSV();
    const request = allRequests.find((r) => r.id === id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }
    if (request.receiverId !== userId) {
      return res.status(403).json({ success: false, message: "You can only edit your own requests." });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "You can only edit requests that are still pending approval."
      });
    }
    if (!itemNeeded || !category || !description) {
      return res.status(400).json({
        success: false,
        message: "Item needed, category, and description are required."
      });
    }
    if (!["normal", "urgent"].includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: "Urgency must be either 'normal' or 'urgent'."
      });
    }
    const updates = {
      itemNeeded,
      category,
      description,
      quantity: quantity || 1,
      urgency,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const success = updateRequestInCSV(id, updates);
    if (!success) {
      return res.status(404).json({ success: false, message: "Failed to update request." });
    }
    const updatedRequests = readRequestsFromCSV();
    const updatedRequest = updatedRequests.find((r) => r.id === id);
    res.json({
      success: true,
      message: "Request updated successfully.",
      request: updatedRequest ? csvToApiRequest(updatedRequest) : null
    });
  } catch (error) {
    console.error("Update request error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const deleteRequest = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const allRequests = readRequestsFromCSV();
    const request = allRequests.find((r) => r.id === id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }
    if (request.receiverId !== userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own requests." });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "You can only delete requests that are still pending approval."
      });
    }
    const success = deleteRequestFromCSV(id);
    if (!success) {
      return res.status(404).json({ success: false, message: "Failed to delete request." });
    }
    res.json({
      success: true,
      message: "Request deleted successfully."
    });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const getAllRequests = (req, res) => {
  try {
    const allRequests = readRequestsFromCSV();
    const requestsWithReceiverInfo = allRequests.map((request) => ({
      ...csvToApiRequest(request),
      receiverName: request.receiverName,
      receiverEmail: request.receiverEmail
    }));
    const response = {
      success: true,
      requests: requestsWithReceiverInfo
    };
    res.json(response);
  } catch (error) {
    console.error("Get all requests error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const approveRequest = (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'approve' or 'reject'."
      });
    }
    const allRequests = readRequestsFromCSV();
    const request = allRequests.find((r) => r.id === id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be approved or rejected."
      });
    }
    const updates = {
      status: action === "approve" ? "approved" : "rejected",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const success = updateRequestInCSV(id, updates);
    if (!success) {
      return res.status(404).json({ success: false, message: "Failed to update request status." });
    }
    const response = {
      success: true,
      message: `Request ${action}d successfully.`
    };
    res.json(response);
  } catch (error) {
    console.error("Approve request error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const getPublicRequests = (req, res) => {
  try {
    const allRequests = readRequestsFromCSV();
    const publicRequests = allRequests.filter((request) => request.status === "approved").map((request) => ({
      ...csvToApiRequest(request),
      receiverName: request.receiverName || "Anonymous",
      receiverEmail: request.receiverEmail || "Hidden"
    })).sort((a, b) => {
      if (a.urgency === "urgent" && b.urgency !== "urgent") return -1;
      if (b.urgency === "urgent" && a.urgency !== "urgent") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    res.json({
      success: true,
      requests: publicRequests
    });
  } catch (error) {
    console.error("Get public requests error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const matches = [];
const createMatch = (req, res) => {
  try {
    const { donationId, requestId } = req.body;
    if (!donationId || !requestId) {
      const response2 = {
        success: false,
        message: "Both donation ID and request ID are required."
      };
      return res.status(400).json(response2);
    }
    const donations = readDonationsFromCSV();
    const requests = readRequestsFromCSV();
    const donation = donations.find((d) => d.id === donationId);
    if (!donation) {
      const response2 = {
        success: false,
        message: "Donation not found."
      };
      return res.status(404).json(response2);
    }
    const request = requests.find((r) => r.id === requestId);
    if (!request) {
      const response2 = {
        success: false,
        message: "Request not found."
      };
      return res.status(404).json(response2);
    }
    if (donation.status !== "approved") {
      const response2 = {
        success: false,
        message: "Only approved donations can be matched."
      };
      return res.status(400).json(response2);
    }
    if (request.status !== "approved") {
      const response2 = {
        success: false,
        message: "Only approved requests can be matched."
      };
      return res.status(400).json(response2);
    }
    if (donation.status === "matched") {
      const response2 = {
        success: false,
        message: "This donation has already been matched."
      };
      return res.status(400).json(response2);
    }
    if (request.status === "matched") {
      const response2 = {
        success: false,
        message: "This request has already been matched."
      };
      return res.status(400).json(response2);
    }
    if (donation.category !== request.category) {
      console.warn(`Category mismatch: Donation (${donation.category}) and Request (${request.category})`);
    }
    const matchId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newMatch = {
      id: matchId,
      donationId,
      requestId,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    matches.push(newMatch);
    updateDonationInCSV(donationId, { status: "matched", updatedAt: now });
    updateRequestInCSV(requestId, { status: "matched", updatedAt: now });
    const response = {
      success: true,
      message: "Donation and request matched successfully!",
      match: newMatch
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Create match error:", error);
    const response = {
      success: false,
      message: "Internal server error."
    };
    res.status(500).json(response);
  }
};
const getAllMatches = (req, res) => {
  try {
    const donations = readDonationsFromCSV();
    const requests = readRequestsFromCSV();
    const enhancedMatches = matches.map((match) => {
      const donation = donations.find((d) => d.id === match.donationId);
      const request = requests.find((r) => r.id === match.requestId);
      return {
        ...match,
        donation: donation ? {
          itemName: donation.itemName,
          category: donation.category,
          donorName: donation.donorName
        } : null,
        request: request ? {
          itemNeeded: request.itemNeeded,
          category: request.category,
          receiverName: request.receiverName
        } : null
      };
    });
    res.json({
      success: true,
      matches: enhancedMatches
    });
  } catch (error) {
    console.error("Get all matches error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const completeMatch = (req, res) => {
  try {
    const { id } = req.params;
    const match = matches.find((m) => m.id === id);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found." });
    }
    if (match.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active matches can be completed."
      });
    }
    match.status = "completed";
    match.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    res.json({
      success: true,
      message: "Match completed successfully.",
      match
    });
  } catch (error) {
    console.error("Complete match error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const cancelMatch = (req, res) => {
  try {
    const { id } = req.params;
    const match = matches.find((m) => m.id === id);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found." });
    }
    if (match.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active matches can be cancelled."
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    updateDonationInCSV(match.donationId, { status: "approved", updatedAt: now });
    updateRequestInCSV(match.requestId, { status: "approved", updatedAt: now });
    match.status = "cancelled";
    match.updatedAt = now;
    res.json({
      success: true,
      message: "Match cancelled successfully. Donation and request are now available for new matches.",
      match
    });
  } catch (error) {
    console.error("Cancel match error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const getPublicActivitiesWithSample = (req, res) => {
  try {
    const activities = [];
    const donations = readDonationsFromCSV();
    const approvedDonations = donations.filter((d) => d.status === "approved");
    const requests = readRequestsFromCSV();
    const approvedRequests = requests.filter((r) => r.status === "approved");
    approvedDonations.forEach((donation) => {
      activities.push({
        id: donation.id,
        type: "donation",
        userName: donation.donorName,
        itemName: donation.itemName,
        quantity: donation.quantity.toString(),
        location: "Local Community",
        // Could be enhanced with actual location data
        timestamp: donation.createdAt
      });
    });
    approvedRequests.forEach((request) => {
      activities.push({
        id: request.id,
        type: "request",
        userName: request.receiverName,
        itemName: request.itemNeeded,
        quantity: request.quantity.toString(),
        location: "Local Community",
        // Could be enhanced with actual location data
        timestamp: request.createdAt
      });
    });
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentActivities = activities.slice(0, 20);
    res.json({
      success: true,
      activities: recentActivities
    });
  } catch (error) {
    console.error("Get public activities error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      activities: []
    });
  }
};
const getPublicDonations = (req, res) => {
  try {
    const allDonations = readDonationsFromCSV();
    const publicDonations = allDonations.filter((donation) => donation.status === "approved").map((donation) => ({
      id: donation.id,
      donorName: donation.donorName,
      itemName: donation.itemName,
      category: donation.category,
      description: donation.description,
      quantity: donation.quantity,
      photoUrl: donation.photoUrl || void 0,
      createdAt: donation.createdAt,
      updatedAt: donation.updatedAt
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({
      success: true,
      donations: publicDonations
    });
  } catch (error) {
    console.error("Get public donations error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      donations: []
    });
  }
};
const searchPublicData = (req, res) => {
  try {
    const {
      itemName = "",
      category = "all",
      minQuantity = "1",
      maxQuantity = "100",
      urgency = "all",
      type = "both"
    } = req.query;
    let donations = [];
    let requests = [];
    if (type === "donations" || type === "both") {
      const allDonations = readDonationsFromCSV();
      donations = allDonations.filter((donation) => donation.status === "approved").filter((donation) => {
        if (category !== "all" && donation.category !== category) return false;
        if (itemName && !donation.itemName.toLowerCase().includes(itemName.toLowerCase())) return false;
        const min = parseInt(minQuantity) || 1;
        const max = parseInt(maxQuantity) || 100;
        if (donation.quantity < min || donation.quantity > max) return false;
        return true;
      }).map((donation) => ({
        id: donation.id,
        donorName: donation.donorName,
        itemName: donation.itemName,
        category: donation.category,
        description: donation.description,
        quantity: donation.quantity,
        photoUrl: donation.photoUrl || void 0,
        createdAt: donation.createdAt,
        updatedAt: donation.updatedAt
      }));
    }
    if (type === "requests" || type === "both") {
      const allRequests = readRequestsFromCSV();
      requests = allRequests.filter((request) => request.status === "approved").filter((request) => {
        if (category !== "all" && request.category !== category) return false;
        if (itemName && !request.itemNeeded.toLowerCase().includes(itemName.toLowerCase())) return false;
        const min = parseInt(minQuantity) || 1;
        const max = parseInt(maxQuantity) || 100;
        if (request.quantity < min || request.quantity > max) return false;
        if (urgency !== "all" && request.urgency !== urgency) return false;
        return true;
      }).map((request) => ({
        id: request.id,
        receiverName: request.receiverName,
        itemNeeded: request.itemNeeded,
        category: request.category,
        description: request.description,
        quantity: request.quantity,
        urgency: request.urgency,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      }));
    }
    const sortByRelevance = (items, searchTerm) => {
      return items.sort((a, b) => {
        const aName = "itemName" in a ? a.itemName : a.itemNeeded;
        const bName = "itemName" in b ? b.itemName : b.itemNeeded;
        const aExact = aName.toLowerCase() === searchTerm.toLowerCase() ? 100 : 0;
        const bExact = bName.toLowerCase() === searchTerm.toLowerCase() ? 100 : 0;
        const aPartial = aName.toLowerCase().includes(searchTerm.toLowerCase()) ? 50 : 0;
        const bPartial = bName.toLowerCase().includes(searchTerm.toLowerCase()) ? 50 : 0;
        const aUrgency = "urgency" in a && a.urgency === "urgent" ? 30 : 0;
        const bUrgency = "urgency" in b && b.urgency === "urgent" ? 30 : 0;
        const aDays = (Date.now() - new Date(a.createdAt).getTime()) / (1e3 * 60 * 60 * 24);
        const bDays = (Date.now() - new Date(b.createdAt).getTime()) / (1e3 * 60 * 60 * 24);
        const aRecent = Math.max(0, 20 - aDays);
        const bRecent = Math.max(0, 20 - bDays);
        const aScore = aExact + aPartial + aUrgency + aRecent;
        const bScore = bExact + bPartial + bUrgency + bRecent;
        return bScore - aScore;
      });
    };
    if (itemName) {
      donations = sortByRelevance(donations, itemName);
      requests = sortByRelevance(requests, itemName);
    } else {
      donations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    res.json({
      success: true,
      donations,
      requests
    });
  } catch (error) {
    console.error("Search public data error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      donations: [],
      requests: []
    });
  }
};
const seedTestData = (req, res) => {
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sampleDonations = [
      {
        id: generateId(),
        donorId: "donor1",
        donorName: "John Doe",
        donorEmail: "john@example.com",
        itemName: "Winter Clothes",
        category: "clothes",
        description: "Warm winter jackets, sweaters, and pants for children ages 5-12",
        quantity: 20,
        photoUrl: "",
        status: "approved",
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateId(),
        donorId: "donor2",
        donorName: "Jane Smith",
        donorEmail: "jane@example.com",
        itemName: "Rice and Lentils",
        category: "food",
        description: "50kg of rice and 20kg of lentils for families in need",
        quantity: 70,
        photoUrl: "",
        status: "approved",
        createdAt: new Date(Date.now() - 864e5).toISOString(),
        updatedAt: new Date(Date.now() - 864e5).toISOString()
      },
      {
        id: generateId(),
        donorId: "donor3",
        donorName: "Medical Center",
        donorEmail: "medical@example.com",
        itemName: "Medical Supplies",
        category: "medical",
        description: "First aid kits, bandages, and basic medicines",
        quantity: 15,
        photoUrl: "",
        status: "approved",
        createdAt: new Date(Date.now() - 1728e5).toISOString(),
        updatedAt: new Date(Date.now() - 1728e5).toISOString()
      },
      {
        id: generateId(),
        donorId: "donor4",
        donorName: "Tech Company",
        donorEmail: "tech@example.com",
        itemName: "Laptops",
        category: "electronics",
        description: "Refurbished laptops for students and educational purposes",
        quantity: 5,
        photoUrl: "",
        status: "approved",
        createdAt: new Date(Date.now() - 2592e5).toISOString(),
        updatedAt: new Date(Date.now() - 2592e5).toISOString()
      },
      {
        id: generateId(),
        donorId: "donor5",
        donorName: "Book Lover",
        donorEmail: "books@example.com",
        itemName: "Educational Books",
        category: "books",
        description: "Textbooks and reference books for high school students",
        quantity: 50,
        photoUrl: "",
        status: "approved",
        createdAt: new Date(Date.now() - 3456e5).toISOString(),
        updatedAt: new Date(Date.now() - 3456e5).toISOString()
      }
    ];
    const sampleRequests = [
      {
        id: generateId(),
        receiverId: "receiver1",
        receiverName: "Maria Garcia",
        receiverEmail: "maria@example.com",
        itemNeeded: "School Supplies",
        category: "books",
        description: "Notebooks, pens, pencils for 3 children starting school",
        quantity: 30,
        urgency: "urgent",
        status: "approved",
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateId(),
        receiverId: "receiver2",
        receiverName: "Ahmed Ali",
        receiverEmail: "ahmed@example.com",
        itemNeeded: "Baby Formula",
        category: "food",
        description: "Infant formula for 6-month-old baby - lactose-free if possible",
        quantity: 10,
        urgency: "urgent",
        status: "approved",
        createdAt: new Date(Date.now() - 432e5).toISOString(),
        updatedAt: new Date(Date.now() - 432e5).toISOString()
      },
      {
        id: generateId(),
        receiverId: "receiver3",
        receiverName: "Chen Wei",
        receiverEmail: "chen@example.com",
        itemNeeded: "Blankets",
        category: "clothes",
        description: "Warm blankets for elderly family members during winter",
        quantity: 5,
        urgency: "normal",
        status: "approved",
        createdAt: new Date(Date.now() - 1296e5).toISOString(),
        updatedAt: new Date(Date.now() - 1296e5).toISOString()
      },
      {
        id: generateId(),
        receiverId: "receiver4",
        receiverName: "Local Clinic",
        receiverEmail: "clinic@example.com",
        itemNeeded: "Blood Pressure Monitor",
        category: "medical",
        description: "Digital blood pressure monitor for community health checks",
        quantity: 2,
        urgency: "normal",
        status: "approved",
        createdAt: new Date(Date.now() - 216e6).toISOString(),
        updatedAt: new Date(Date.now() - 216e6).toISOString()
      },
      {
        id: generateId(),
        receiverId: "receiver5",
        receiverName: "Single Parent",
        receiverEmail: "parent@example.com",
        itemNeeded: "Children Toys",
        category: "toys",
        description: "Educational toys for 2 children ages 3 and 5",
        quantity: 8,
        urgency: "normal",
        status: "approved",
        createdAt: new Date(Date.now() - 3024e5).toISOString(),
        updatedAt: new Date(Date.now() - 3024e5).toISOString()
      }
    ];
    sampleDonations.forEach((donation) => {
      saveDonationToCSV(donation);
    });
    sampleRequests.forEach((request) => {
      saveRequestToCSV(request);
    });
    res.json({
      success: true,
      message: `Seeded ${sampleDonations.length} donations and ${sampleRequests.length} requests to CSV files.`,
      data: {
        donations: sampleDonations.length,
        requests: sampleRequests.length
      }
    });
  } catch (error) {
    console.error("Seed data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed test data."
    });
  }
};
function createServer() {
  const app2 = express__default();
  initializeCSVFiles();
  app2.use(cors());
  app2.use(express__default.json());
  app2.use(express__default.urlencoded({ extended: true }));
  app2.get("/api/public/requests", getPublicRequests);
  app2.get("/api/public/donations", getPublicDonations);
  app2.get("/api/public/search", searchPublicData);
  app2.get("/api/public/activities", getPublicActivitiesWithSample);
  app2.post("/api/register", handleRegister);
  app2.post("/api/login", handleLogin);
  app2.post("/api/donations/add", authenticateToken, requireRole(["donor"]), addDonation);
  app2.get("/api/donations/my", authenticateToken, requireRole(["donor"]), getMyDonations);
  app2.put("/api/donations/:id", authenticateToken, requireRole(["donor"]), updateDonation);
  app2.delete("/api/donations/:id", authenticateToken, requireRole(["donor"]), deleteDonation);
  app2.post("/api/requests/add", authenticateToken, requireRole(["receiver"]), addRequest);
  app2.get("/api/requests/my", authenticateToken, requireRole(["receiver"]), getMyRequests);
  app2.put("/api/requests/:id", authenticateToken, requireRole(["receiver"]), updateRequest);
  app2.delete("/api/requests/:id", authenticateToken, requireRole(["receiver"]), deleteRequest);
  app2.get("/api/admin/donations", authenticateToken, requireRole(["admin"]), getAllDonations);
  app2.put("/api/admin/donations/:id/approve", authenticateToken, requireRole(["admin"]), approveDonation);
  app2.get("/api/admin/requests", authenticateToken, requireRole(["admin"]), getAllRequests);
  app2.put("/api/admin/requests/:id/approve", authenticateToken, requireRole(["admin"]), approveRequest);
  app2.post("/api/admin/match", authenticateToken, requireRole(["admin"]), createMatch);
  app2.get("/api/admin/matches", authenticateToken, requireRole(["admin"]), getAllMatches);
  app2.put("/api/admin/matches/:id/complete", authenticateToken, requireRole(["admin"]), completeMatch);
  app2.put("/api/admin/matches/:id/cancel", authenticateToken, requireRole(["admin"]), cancelMatch);
  app2.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app2.get("/api/demo", handleDemo);
  app2.post("/api/seed", seedTestData);
  return app2;
}
const app = createServer();
const port = process.env.PORT || 3e3;
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
