import moment from "moment-timezone";
import "../../lib/settings/config.js";

moment.tz.setDefault(global.appearance.timezone || "Asia/Jakarta");

export const getWIBTime = (format = global.appearance.timeFormat || "HH:mm:ss") => moment().format(format);

export const getWIBDate = (format = global.appearance.dateFormat || "DD/MM/YYYY") => moment().format(format);

export const getWIBDateTime = (format = global.appearance.fullDateFormat || "DD/MM/YYYY HH:mm:ss") => moment().format(format);

export const getGreeting = () => {
  const time = moment().tz("Asia/Jakarta").format("HH:mm:ss");
  if (time < "03:00:00") return "Selamat Malam🌃";
  if (time < "06:00:00") return "Selamat Subuh🌆";
  if (time < "11:00:00") return "Selamat Pagi🏙️";
  if (time < "15:00:00") return "Selamat Siang🏞️";
  if (time < "19:00:00") return "Selamat Sore🌄";
  return "Selamat Malam🌃";
};

export const getWIBFull = () => moment(Date.now()).tz("Asia/Jakarta").locale("id").format("HH:mm:ss z");
export const getWITAFull = () => moment(Date.now()).tz("Asia/Makassar").locale("id").format("HH:mm:ss z");
export const getWITFull = () => moment(Date.now()).tz("Asia/Jayapura").locale("id").format("HH:mm:ss z");
