import { z } from "zod";

interface ValidationResult {
  isOk: boolean;
  message: string;
}

export const validateUserInput = (
  name: string,
  email: string,
  password: string,
  role : string
): ValidationResult | null => {

  // console.log({name,email,password});

  if (!name || !email || !password) {
    return { isOk: false, message: "Please fill all the fields" };
  }
  // if(role !== "mechanic" && role !== "admin"){
  //   return { isOk: false, message: "Role must be mechanic" };
  // }
  if (password.length < 5) {
    return { isOk: false, message: "Password must be at least 5 characters" };
  }

  
  return null;
};

export const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "email is required!",
        invalid_type_error: "email must be a string",
      })
      .email(),
    password: z.string({
      required_error: "password is required!",
      invalid_type_error: "password must be a string",
    }),
  }),
});

export const registerUserValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "name is required!",
      invalid_type_error: "name must be a string",
    }),
    email: z
      .string({
        required_error: "email is required!",
        invalid_type_error: "email must be a string",
      })
      .email(),
    password: z
      .string({
        required_error: "password is required!",
        invalid_type_error: "password must be a string",
      })
      .min(8, "Password must be at least 8 characters long"),
  }),
});
