import { Types } from "mongoose";
import { GenderEnum, RoleEnum } from "../../common/enum/user.enum";

export interface SignupRequestBody {
  userName: string;
  email: string;
  password: string;
  cPassword: string;
  age: number;
  phone?: string;
  address?: string;
  gender?: GenderEnum;
}