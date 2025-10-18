import { Timetable } from "../models/timetable.model.js";

export const getTimetable = async (req, res, next) => {
  try {
    const scope = (req.query.scope || "default").toString();
    let doc = await Timetable.findOne({ scope });
    if (!doc) {
      doc = await Timetable.create({ scope, data: {} });
    }
    return res.status(200).json({ statusCode: 200, data: doc.data, message: "OK" });
  } catch (err) {
    next(err);
  }
};

export const setTimetable = async (req, res, next) => {
  try {
    const scope = (req.body.scope || req.query.scope || "default").toString();
    const data = req.body.data || {};
    const updated = await Timetable.findOneAndUpdate(
      { scope },
      { $set: { data } },
      { new: true, upsert: true }
    );
    return res.status(200).json({ statusCode: 200, data: updated.data, message: "Updated" });
  } catch (err) {
    next(err);
  }
};
