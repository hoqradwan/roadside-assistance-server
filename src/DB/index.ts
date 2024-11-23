import { UserModel } from "../modules/user/user.model";
import { hashPassword } from "../modules/user/user.service";

const admin = {
  name: "MD Admin",
  email: "admin@gmail.com",
  password: "1qazxsw2",
  role: "admin",
  isDeleted: false,
};

export const seedSuperAdmin = async () => {
  const isSuperAdminExists = await UserModel.findOne({ email: admin.email });

  if (!isSuperAdminExists) {
    const hashedPassword = await hashPassword(admin.password);
    const adminWithHashedPassword = { ...admin, password: hashedPassword };

    // console.log("Super Admin created");
    await UserModel.create(adminWithHashedPassword);
  }
};

export default seedSuperAdmin;
