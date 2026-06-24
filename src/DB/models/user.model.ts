import mongoose, { HydratedDocument, Types } from "mongoose";
import {
  GenderEnum,
  ProviderEnum,
  RoleEnum,
} from "../../common/enum/user.enum";

export interface IUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  age: number;
  phone?: string;
  address?: string;
  profilePic?: string;
  gender?: GenderEnum;
  role?: RoleEnum;
  provider?: ProviderEnum;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
  friends?: [Types.ObjectId]
}

const userSchema = new mongoose.Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      min: 3,
      max: 25,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      min: 3,
      max: 25,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: function (): boolean {
        return this.provider == ProviderEnum.google ? false : true;
      },
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      trim: true,
      min: 20,
      max: 50,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: GenderEnum,
      default: GenderEnum.male,
    },
    role: {
      type: String,
      enum: RoleEnum,
      default: RoleEnum.user,
    },
    provider: {
      type: String,
      enum: ProviderEnum,
      default: ProviderEnum.system,
    },
    profilePic: String,
    confirmed: Boolean,
    friends: [{ type: Types.ObjectId, ref:"User"}]
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema
  .virtual("userName")
  .get(function () {
    return this.firstName + " " + this.lastName;
  })
  .set(function (val: string) {
    this.set({ firstName: val.split(" ")[0], lastName: val.split(" ")[1] });
  });

// userSchema.pre(
//   "save",
//   function (this: HydratedDocument<IUser> & { is_new: boolean }) {
//     console.log("-------- Pre Save --------");
//     this.is_new = this.isNew;
//     if (this.isModified("password"))
//       this.password = Hash({ plainText: this.password });
//   },
// );

// userSchema.post("save", async function () {
//   console.log("-------- Post Save --------");
//   const that = this as HydratedDocument<IUser> & { is_new: boolean };
//   if (that.is_new) {
//     const otp = await generateOTP();
//     eventEmitter.emit(EmailEnum.confirmEmail, async () => {
//       await sendEmail({
//         to: this.email,
//         subject: "Email Confirmation",
//         html: emailTemplate({ userName: this.userName, otp }),
//       });
//     });
//   }
// });

// userSchema.pre("findOne", function () {
//   const { paranoid, ...rest } = this.getQuery();

//   if (paranoid == false) {
//     this.setQuery({ ...rest });
//   } else {
//     this.setQuery({ ...rest, deletedAt: { $exists: false } });
//   }
// });

const userModel =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default userModel;