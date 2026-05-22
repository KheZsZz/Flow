  import { Request, Response, NextFunction } from "express";
  import { AuthRequest } from "@/middleware/auth";
  import { supabase } from "@/config/supabase";
  import { LoginUserType, UserSchema, LoginUserSchema, RegisterUserSchema } from "@/schemas/usersSchema";

  class UserController {
    async signUp(req: AuthRequest, res: Response, next: NextFunction) {
        const {  
          name_user,
          email_user,
          password_user,
          phone_user, 
          profile_user, 
        } = RegisterUserSchema.parse(req.body);

        if (!email_user || !password_user || !name_user || !phone_user || !profile_user) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        
        try {
            const {data, error} = await supabase.auth.signUp({
                email: email_user,
                password: password_user,
                options: {
                    data: {
                        name_user,
                        phone_user,
                        profile_user,
                        created_by:req.user?.id,
                    }
                }
            });
            res.status(201).json({ message: 'User registered successfully.', data, error});
        } catch (error) {
            next(error);
        }
    }

    async update(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const { id } = req.params; 
        
        const {
          phone_user,
          document_user,
          name_user,
          email_user,
          profile_user,
          password_user,
          avatar_url,
          is_active
        } = UserSchema.parse(req.body);

        if (!req.company?.id) {
          return res.status(400).json({ error: "Contexto de empresa ausente." });
        }

        const updateAuthParams: any = {};

        if (email_user) updateAuthParams.email = email_user;
        if (password_user) updateAuthParams.password = password_user;
        if (phone_user) updateAuthParams.phone = phone_user;

        if (Object.keys(updateAuthParams).length > 0) {
          const { error: authUpdateError } = await supabase.auth.admin.updateUserById(id as string, updateAuthParams);
          if (authUpdateError) throw authUpdateError;
        }

        const { data, error: dbError } = await supabase
          .from("users")
          .update({
            document_user,
            name_user,
            email_user,
            profile_user,
            avatar_url,
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
          .eq("corporation_id", req.company?.id) 
          .select()
          .single();

        if (dbError) throw dbError;

        return res.status(200).json({ message: "User updated successfully", data });
      } catch (error) {
        next(error);
      }
    }
    
    async disable(req: AuthRequest, res: Response, next: NextFunction) {
      const { id } = req.params;
      try {
        const { data, error } = await supabase
          .from("users")
          .update({ is_active: true })
          .eq("id", id);
        if (error) throw error;
        res.status(200).json({ message: "User disabled successfully", data });
      } catch (error) {
        next(error);
      }
    }

    async findbyId(req: AuthRequest, res: Response, next: NextFunction) {
      const { id } = req.params;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", id);
        if (error) throw error;
        res.status(200).json(data);
      } catch (error) {
        next(error);
      }
    }

    async findAll(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const { data, error } = await supabase.from("users").select("*");
        if (error) throw error;
        res.status(200).json(data);
      } catch (error) {
        next(error);
      }
    }

    async findAllDrivers(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const companyId = req.company?.id;

        if (!companyId) {
          return res
            .status(400)
            .json({ error: "Company context not found in request" });
        }

        const { data: drivers, error } = await supabase
          .from("Drivers")
          .select(
            `
            cnh,
            validade_cnh,
            categoria_cnh,

            Users!user_id (
              id,
              name_user,
              phone,
              is_active,
              corporation_id
            )
          `,
          )
          .eq("Users.corporation_id", companyId);

        if (error) throw error;
        const validDrivers = drivers.filter((driver) => driver.Users !== null);

        const formattedDrivers = validDrivers.map((driver) => {
          const userData = driver.Users as any;

          return {
            name: userData?.name_user,
            email: userData?.email_user,
            phone: userData?.phone,
            is_active: userData?.is_active,
            cnh: driver.cnh,
            validade_cnh: driver.validade_cnh,
            categoria_cnh: driver.categoria_cnh,
          };
        });

        return res.status(200).json(formattedDrivers);
      } catch (error) {
        next(error);
      }
    }

    async signIn(req: Request, res: Response, next: NextFunction) {
        const { email_user, password_user }: LoginUserType = LoginUserSchema.parse(req.body);
    
        if (!email_user || !password_user) {
          return res
            .status(400)
            .json({ error: "Email and password are required." });
        }
    
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email_user,
            password: password_user,
          });
          if (error) throw error;
          res
            .status(200)
            .json({ authorized: true, token: data.session.access_token });
        } catch (error) {
          next(error);
        }
    } 

    async signOut(req: Request, res: Response, next: NextFunction) {
      try {
        const { error } = await supabase.auth.signOut();

        if (error) return res.status(400).json({ error: error.message });

        res
          .status(200)
          .json({ authorized: false, message: "User signed out successfully." });
      } catch (error) {
        next(error);
      }
    }
  }

  export const userController = new UserController();
