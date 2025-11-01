import React, { useState, useEffect } from "react";
import axios from "axios";
import "./questionManagement.css";

export default function QuestionManagement() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    content: "",
    type: "single",
    options: [{ text: "", isCorrect: false }],
    pairs: [{ left: "", right: "" }],
    matrix: { rows: [""], columns: [""], correct: [[false]] },
    imageUrl: "",
    areas: [{ x: 0, y: 0, width: 50, height: 50 }],
    draggables: [""],
    dropzones: [""],
    correctMapping: [{ draggable: "", dropzone: "" }]
  });

  // Fetch
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/questions");
      setQuestions(Array.isArray(res.data) ? res.data : []);
    } catch {
      alert("❌ Lỗi khi tải danh sách câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOptionChange = (i, field, value) => {
    const updated = [...form.options];
    updated[i][field] = value;
    setForm({ ...form, options: updated });
  };

  const addOption = () =>
    setForm({ ...form, options: [...form.options, { text: "", isCorrect: false }] });

  const handleSave = async () => {
    if (!form.content.trim()) return alert("⚠️ Nội dung không được trống");
    try {
      if (editing) {
        const res = await axios.put(
          `http://localhost:5000/api/questions/${editing._id}`,
          form
        );
        setQuestions(questions.map((q) => (q._id === editing._id ? res.data : q)));
      } else {
        const res = await axios.post("http://localhost:5000/api/questions", form);
        setQuestions([...questions, res.data]);
      }
      resetForm();
    } catch {
      alert("❌ Không thể lưu câu hỏi");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/questions/${id}`);
      setQuestions(questions.filter((q) => q._id !== id));
    } catch {
      alert("❌ Không thể xóa câu hỏi");
    }
  };

  const handleEdit = (q) => {
    setEditing(q);
    setForm(q);
  };

  const resetForm = () => {
    setForm({
      content: "",
      type: "single",
      options: [{ text: "", isCorrect: false }],
      pairs: [{ left: "", right: "" }],
      matrix: { rows: [""], columns: [""], correct: [[false]] },
      imageUrl: "",
      areas: [{ x: 0, y: 0, width: 50, height: 50 }],
      draggables: [""],
      dropzones: [""],
      correctMapping: [{ draggable: "", dropzone: "" }]
    });
    setEditing(null);
  };

  // === Render form theo loại câu hỏi ===
  const renderFormByType = () => {
    switch (form.type) {
      case "single":
      case "multi":
        return (
          <div className="field-group">
            <label>Danh sách đáp án:</label>
            {form.options.map((opt, i) => (
              <div key={i} className="option-row">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionChange(i, "text", e.target.value)}
                  placeholder={`Đáp án ${i + 1}`}
                />
                <label>
                  <input
                    type={form.type === "single" ? "radio" : "checkbox"}
                    name="isCorrect"
                    checked={opt.isCorrect}
                    onChange={(e) => {
                      const updated = form.options.map((o, j) => ({
                        ...o,
                        isCorrect:
                          form.type === "single"
                            ? j === i
                            : j === i
                              ? e.target.checked
                              : o.isCorrect
                      }));
                      setForm({ ...form, options: updated });
                    }}
                  />
                  Đúng
                </label>
              </div>
            ))}
            <button type="button" className="add-btn" onClick={addOption}>
              ➕ Thêm đáp án
            </button>
          </div>
        );

      case "drop-match":
        return (
          <div className="field-group">
            <label>Các cặp ghép đôi:</label>
            {form.pairs.map((pair, i) => (
              <div key={i} className="pair-row">
                <input
                  value={pair.left}
                  placeholder="Trái"
                  onChange={(e) => {
                    const updated = [...form.pairs];
                    updated[i].left = e.target.value;
                    setForm({ ...form, pairs: updated });
                  }}
                />
                <span>↔️</span>
                <input
                  value={pair.right}
                  placeholder="Phải"
                  onChange={(e) => {
                    const updated = [...form.pairs];
                    updated[i].right = e.target.value;
                    setForm({ ...form, pairs: updated });
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="add-btn"
              onClick={() =>
                setForm({ ...form, pairs: [...form.pairs, { left: "", right: "" }] })
              }
            >
              ➕ Thêm cặp
            </button>
          </div>
        );
      case "matrix":
        return (
          <div className="field-group">
            <label>Ma trận câu hỏi:</label>

            <div className="matrix-section">
              <div>
                <p><strong>Hàng (Rows):</strong></p>
                {form.matrix.rows.map((r, i) => (
                  <input
                    key={i}
                    value={r}
                    onChange={(e) => {
                      const rows = [...form.matrix.rows];
                      rows[i] = e.target.value;
                      setForm({ ...form, matrix: { ...form.matrix, rows } });
                    }}
                    placeholder={`Hàng ${i + 1}`}
                  />
                ))}
                <button
                  type="button"
                  className="add-btn"
                  onClick={() =>
                    setForm({
                      ...form,
                      matrix: {
                        ...form.matrix,
                        rows: [...form.matrix.rows, ""],
                        correct: [
                          ...form.matrix.correct,
                          Array(form.matrix.columns.length).fill(false),
                        ],
                      },
                    })
                  }
                >
                  ➕ Thêm hàng
                </button>
              </div>

              <div>
                <p><strong>Cột (Columns):</strong></p>
                {form.matrix.columns.map((c, i) => (
                  <input
                    key={i}
                    value={c}
                    onChange={(e) => {
                      const columns = [...form.matrix.columns];
                      columns[i] = e.target.value;
                      const correct = form.matrix.correct.map((row) => {
                        const newRow = [...row];
                        newRow[i] = newRow[i] || false;
                        return newRow;
                      });
                      setForm({
                        ...form,
                        matrix: { ...form.matrix, columns, correct },
                      });
                    }}
                    placeholder={`Cột ${i + 1}`}
                  />
                ))}
                <button
                  type="button"
                  className="add-btn"
                  onClick={() => {
                    const newCols = [...form.matrix.columns, ""];
                    const newCorrect = form.matrix.correct.map((row) => [...row, false]);
                    setForm({
                      ...form,
                      matrix: { ...form.matrix, columns: newCols, correct: newCorrect },
                    });
                  }}
                >
                  ➕ Thêm cột
                </button>
              </div>
            </div>

            <div className="matrix-grid">
              <div className="matrix-header">
                <span></span>
                {form.matrix.columns.map((col, j) => (
                  <span key={j} className="matrix-col-header">{col || `Cột ${j + 1}`}</span>
                ))}
              </div>
              {form.matrix.rows.map((row, i) => (
                <div key={i} className="matrix-row">
                  <span className="matrix-row-header">{row || `Hàng ${i + 1}`}</span>
                  {form.matrix.columns.map((_, j) => (
                    <label key={j} className="matrix-cell">
                      <input
                        type="checkbox"
                        checked={form.matrix.correct[i][j]}
                        onChange={(e) => {
                          const updated = form.matrix.correct.map((r, ri) =>
                            ri === i
                              ? r.map((cell, cj) => (cj === j ? e.target.checked : cell))
                              : r
                          );
                          setForm({
                            ...form,
                            matrix: { ...form.matrix, correct: updated },
                          });
                        }}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );

      case "image-area":
        return (
          <div className="field-group">
            <label>Ảnh và vùng chọn:</label>
            <input
              type="text"
              name="imageUrl"
              placeholder="URL ảnh"
              value={form.imageUrl}
              onChange={handleChange}
            />
            <small>Vùng chọn (x,y,width,height)</small>
            {form.areas.map((a, i) => (
              <div key={i} className="area-row">
                <input
                  type="number"
                  value={a.x}
                  onChange={(e) => {
                    const updated = [...form.areas];
                    updated[i].x = +e.target.value;
                    setForm({ ...form, areas: updated });
                  }}
                />
                <input
                  type="number"
                  value={a.y}
                  onChange={(e) => {
                    const updated = [...form.areas];
                    updated[i].y = +e.target.value;
                    setForm({ ...form, areas: updated });
                  }}
                />
                <input
                  type="number"
                  value={a.width}
                  onChange={(e) => {
                    const updated = [...form.areas];
                    updated[i].width = +e.target.value;
                    setForm({ ...form, areas: updated });
                  }}
                />
                <input
                  type="number"
                  value={a.height}
                  onChange={(e) => {
                    const updated = [...form.areas];
                    updated[i].height = +e.target.value;
                    setForm({ ...form, areas: updated });
                  }}
                />
              </div>
            ))}
          </div>
        );

      case "drag-drop":
        return (
          <div className="field-group">
            <label>Kéo & Thả:</label>

            <div className="drag-drop-section">
              <div>
                <p><strong>Draggables (kéo):</strong></p>
                {form.draggables.map((d, i) => (
                  <div key={i} className="pair-row">
                    <input
                      value={d}
                      onChange={(e) => {
                        const updated = [...form.draggables];
                        updated[i] = e.target.value;
                        setForm({ ...form, draggables: updated });
                      }}
                      placeholder={`Draggable ${i + 1}`}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="add-btn"
                  onClick={() =>
                    setForm({
                      ...form,
                      draggables: [...form.draggables, ""],
                    })
                  }
                >
                  ➕ Thêm draggable
                </button>
              </div>

              <div>
                <p><strong>Dropzones (thả):</strong></p>
                {form.dropzones.map((d, i) => (
                  <div key={i} className="pair-row">
                    <input
                      value={d}
                      onChange={(e) => {
                        const updated = [...form.dropzones];
                        updated[i] = e.target.value;
                        setForm({ ...form, dropzones: updated });
                      }}
                      placeholder={`Dropzone ${i + 1}`}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="add-btn"
                  onClick={() =>
                    setForm({
                      ...form,
                      dropzones: [...form.dropzones, ""],
                    })
                  }
                >
                  ➕ Thêm dropzone
                </button>
              </div>

              <div>
                <p><strong>Các cặp đúng:</strong></p>
                {form.correctMapping.map((m, i) => (
                  <div key={i} className="pair-row">
                    <select
                      value={m.draggable}
                      onChange={(e) => {
                        const updated = [...form.correctMapping];
                        updated[i].draggable = e.target.value;
                        setForm({ ...form, correctMapping: updated });
                      }}
                    >
                      <option value="">Chọn draggable</option>
                      {form.draggables.map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                    </select>
                    <span>➡️</span>
                    <select
                      value={m.dropzone}
                      onChange={(e) => {
                        const updated = [...form.correctMapping];
                        updated[i].dropzone = e.target.value;
                        setForm({ ...form, correctMapping: updated });
                      }}
                    >
                      <option value="">Chọn dropzone</option>
                      {form.dropzones.map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-btn"
                  onClick={() =>
                    setForm({
                      ...form,
                      correctMapping: [
                        ...form.correctMapping,
                        { draggable: "", dropzone: "" },
                      ],
                    })
                  }
                >
                  ➕ Thêm cặp đúng
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const filtered = questions.filter((q) =>
    q.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="question-admin-container">
      <h2 className="page-title">🧩 Quản lý Câu hỏi</h2>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Tìm câu hỏi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* --- FORM --- */}
      <div className="question-form">
        <textarea
          name="content"
          placeholder="Nhập nội dung câu hỏi..."
          value={form.content}
          onChange={handleChange}
        />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="single">SingleChoice</option>
          <option value="multi">MultiChoice</option>
          <option value="drop-match">Drop-match</option>
          <option value="matrix">Matrix</option>
          <option value="image-area">Image-area</option>
          <option value="drag-drop">Drag-drop</option>
        </select>

        {renderFormByType()}

        <div className="form-buttons">
          <button className="save-btn" onClick={handleSave}>
            {editing ? "💾 Cập nhật" : "➕ Thêm mới"}
          </button>
          {editing && (
            <button className="cancel-btn" onClick={resetForm}>
              ❌ Hủy
            </button>
          )}
        </div>
      </div>

      {/* --- DANH SÁCH CÂU HỎI --- */}
      {loading ? (
        <p className="loading">⏳ Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className="no-data">⚠️ Không có câu hỏi</p>
      ) : (
        <div className="question-grid">
          {filtered.map((q) => (
            <div className="question-card" key={q._id}>
              <div className="question-header">
                <h4>{q.content}</h4>
                <span className="type-tag">{q.type}</span>
              </div>
              <div className="question-actions">
                <button onClick={() => handleEdit(q)}>✏️</button>
                <button onClick={() => handleDelete(q._id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
