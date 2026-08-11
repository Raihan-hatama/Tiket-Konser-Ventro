import api from "./api";

export const getArtists = async () => {
  const res = await api.get("/artists");
  return res.data;
};

export const getArtist = async (id: number) => {
  const res = await api.get(`/artists/${id}`);
  return res.data;
};

export const createArtist = async (data: FormData) => {
  const token = localStorage.getItem("token");

  const res = await api.post("/artists", data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const updateArtist = async (
  id: number,
  data: FormData
) => {
  const token = localStorage.getItem("token");

  const res = await api.put(`/artists/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const deleteArtist = async (id: number) => {
  const token = localStorage.getItem("token");

  const res = await api.delete(`/artists/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};