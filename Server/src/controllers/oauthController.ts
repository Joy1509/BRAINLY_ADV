import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import user from '../models/userModel';

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: 'http://localhost:5000/api/v1/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.id}@google.com`;
    let existingUser = await user.findOne({ email });

    if (!existingUser) {
      existingUser = await user.create({
        username: profile.displayName || profile.id,
        email,
        provider: 'google',
        providerId: profile.id,
        avatar: profile.photos?.[0]?.value || ''
      });
    }

    return done(null, existingUser);
  } catch (err) {
    return done(err, undefined);
  }
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: 'http://localhost:5000/api/v1/auth/github/callback',
  scope: ['user:email']
}, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.id}@github.com`;
    let existingUser = await user.findOne({ email });

    if (!existingUser) {
      existingUser = await user.create({
        username: profile.username || profile.displayName || profile.id,
        email,
        provider: 'github',
        providerId: profile.id,
        avatar: profile.photos?.[0]?.value || ''
      });
    }

    return done(null, existingUser);
  } catch (err) {
    return done(err, undefined);
  }
}));

export function generateTokenAndRedirect(req: Request, res: Response) {
  try {
    const loggedUser = req.user as any;
    if (!loggedUser) {
      return res.redirect('http://localhost:5173/?error=auth_failed');
    }

    const secret = process.env.SECRET_KEY as string;
    const token = jwt.sign({ userID: loggedUser._id, role: loggedUser.role }, secret, { expiresIn: 3600 });

    // Redirect to frontend with token and userId
    res.redirect(`http://localhost:5173/oauth-callback?token=${token}&userId=${loggedUser._id}&role=${loggedUser.role}`);
  } catch (err) {
    res.redirect('http://localhost:5173/?error=auth_failed');
  }
}

export default passport;
