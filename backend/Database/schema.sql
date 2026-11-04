SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS schema_versions(version INT PRIMARY KEY, applied_at DATETIME(6) NOT NULL);
CREATE TABLE IF NOT EXISTS teachers (
 id CHAR(36) PRIMARY KEY, username VARCHAR(30) NOT NULL, normalized_name VARCHAR(30) COLLATE utf8mb4_bin NOT NULL UNIQUE,
 password_hash VARCHAR(512) NOT NULL, security_stamp CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sessions (
 token_hash CHAR(64) PRIMARY KEY, teacher_id CHAR(36) NOT NULL, expires_at DATETIME(6) NOT NULL,
 INDEX idx_session_expiry(expires_at), FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS classrooms (
 id CHAR(36) PRIMARY KEY, owner_id CHAR(36) NOT NULL, name VARCHAR(50) NOT NULL, created_at DATETIME(6) NOT NULL,
 INDEX idx_class_owner(owner_id), FOREIGN KEY(owner_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS classroom_teachers (
 class_id CHAR(36) NOT NULL, teacher_id CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(class_id,teacher_id), INDEX idx_class_teacher(teacher_id),
 FOREIGN KEY(class_id) REFERENCES classrooms(id), FOREIGN KEY(teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS students (
 id CHAR(36) PRIMARY KEY, class_id CHAR(36) NOT NULL, name VARCHAR(30) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 balance INT NOT NULL DEFAULT 0, species VARCHAR(20) NOT NULL, pet_name VARCHAR(20) NOT NULL,
 experience INT NOT NULL DEFAULT 0, energy INT NOT NULL DEFAULT 70, mood INT NOT NULL DEFAULT 70, created_at DATETIME(6) NOT NULL,
 INDEX idx_student_class(class_id), FOREIGN KEY(class_id) REFERENCES classrooms(id),
 CHECK(balance>=0), CHECK(experience>=0), CHECK(energy BETWEEN 0 AND 100), CHECK(mood BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS tasks (
 id CHAR(36) PRIMARY KEY, class_id CHAR(36) NOT NULL, title VARCHAR(60) NOT NULL, description VARCHAR(1000) NOT NULL,
 reward INT NOT NULL, due_at DATETIME(6) NULL, target_id CHAR(36) NULL, status VARCHAR(10) NOT NULL DEFAULT 'open', created_at DATETIME(6) NOT NULL,
 INDEX idx_task_class(class_id), FOREIGN KEY(class_id) REFERENCES classrooms(id), FOREIGN KEY(target_id) REFERENCES students(id), CHECK(reward BETWEEN 1 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS completions (
 task_id CHAR(36) NOT NULL, student_id CHAR(36) NOT NULL, completed_at DATETIME(6) NOT NULL,
 PRIMARY KEY(task_id,student_id), FOREIGN KEY(task_id) REFERENCES tasks(id), FOREIGN KEY(student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS inventory (
 student_id CHAR(36) NOT NULL, item_id VARCHAR(20) NOT NULL, quantity INT NOT NULL DEFAULT 0,
 PRIMARY KEY(student_id,item_id), FOREIGN KEY(student_id) REFERENCES students(id), CHECK(quantity>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ledger (
 id CHAR(36) PRIMARY KEY, student_id CHAR(36) NOT NULL, delta INT NOT NULL, reason VARCHAR(100) NOT NULL,
 reference_id VARCHAR(160) COLLATE utf8mb4_bin NOT NULL UNIQUE, actor_id CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL,
 INDEX idx_ledger_student_time(student_id,created_at), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(actor_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS operations (
 teacher_id CHAR(36) NOT NULL, request_key VARCHAR(100) COLLATE utf8mb4_bin NOT NULL, kind VARCHAR(40) NOT NULL,
 request_hash CHAR(64) NOT NULL, class_id CHAR(36) NULL, detail VARCHAR(1000) NOT NULL,
 result_json LONGTEXT NOT NULL, created_at DATETIME(6) NOT NULL,
 PRIMARY KEY(teacher_id,request_key), INDEX idx_operation_class_time(class_id,created_at), FOREIGN KEY(teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO schema_versions(version,applied_at) VALUES(1,UTC_TIMESTAMP(6));

INSERT IGNORE INTO schema_versions(version,applied_at) VALUES(2,UTC_TIMESTAMP(6));

CREATE TABLE IF NOT EXISTS student_decorations (
 student_id CHAR(36) NOT NULL, item_id VARCHAR(20) NOT NULL, equipped BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY(student_id,item_id), FOREIGN KEY(student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO schema_versions(version,applied_at) VALUES(3,UTC_TIMESTAMP(6));
