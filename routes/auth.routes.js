import { Router } from "express";
import bcrypt from 'bcryptjs'
import User from '../models/User.model.js'
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import fileUpload from '../config/cloudinary.config.js'
import isAuthenticatedMiddleware from "../middlewares/isAuthenticatedMiddleware.js";

const authRouter = Router()

authRouter.post('/auth/sign-up/user', isAuthenticatedMiddleware, async (req,res) => {
  const { name, employeeCode, level, department, password, comments, imageUrl, dob, phoneNumber, startingDate, emergencyContact, currentStatus, position, fulltime } = req.body

  try {
    const userExists = await User.findOne({employeeCode})
    if (userExists) {
      throw new Error('Employee code already in use')
    }
    const salt = bcrypt.genSaltSync(+process.env.SALT_ROUNDS)
    const passwordHash = bcrypt.hashSync(password, salt)

    const newUser = await User.create({ name, employeeCode, level, department, passwordHash, comments, imageUrl, dob, phoneNumber, startingDate, emergencyContact, currentStatus, position, fulltime })
    if (newUser) {
      return res.status(201).json({message: "User create successfully"})
    }
  } catch (error) {
    console.log(error)

    if (error.message === 'Employee code already in use') {
      return res.status(409).json({message: "Check inputted data"})
    }
    return res.status(500).json({message: "Internal Server Error"})
  }
})

authRouter.get('/user/:id', isAuthenticatedMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const userId = await User.findById(id).select({passwordHash: 0})

    if (!userId) {
      return res.status(404).json({message: "User not found!"})
    }
    return res.status(200).json(userId)
  } catch (error) {
    console.log(error)
    return res.status(500).json({message: "Internal Server Error"})
  }
})

authRouter.put('/user/edit/:id', async (req, res) => {
  try {
    const payload = req.body
    const { id } = req.params

    const updateUser = await User.findByIdAndUpdate({_id: id}, payload, {new: true})
    return res.status(200).json(updateUser)
  } catch (error) {
    console.log(error)
    return res.status(500).json({message: "Internal Server Error"})
  }
})

authRouter.delete('/user/:id',isAuthenticatedMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    await User.findByIdAndDelete({_id: id})
    res.status(204).json()
  } catch (error) {
    console.log(error)
    return res.status(500).json({message: "Internal Server Error"})
  }
})

authRouter.post('/auth/login', async (req, res) => {
  const { employeeCode, password } = req.body

  try {

    const user = await User.findOne({ employeeCode })

    if (!user) {
      throw new Error('Employee Code does not exist.')
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({message: "Invalid Password."})
    }

    const expiresIn = process.env.JWT_EXPIRES
    const secret = process.env.JWT_SECRET

    const token = jwt.sign({ id: user._id, employeeCode: user.employeeCode }, secret, {expiresIn})
    return res.status(200).json({ user: { id: user._id, name: user.name, imageUrl: user.imageUrl, level: user.level, fulltime: user.fulltime}, logged: true, jwt: token })

  } catch (error) {
    console.log(error)
    return res.status(401).json({message: 'Employee code does not exist.'})
  }
})

authRouter.post('/user/file-upload', isAuthenticatedMiddleware, fileUpload.single('rogers_images'), (req, res) => {
  return res.status(201).json({url: req.file.path})
})

export default authRouter