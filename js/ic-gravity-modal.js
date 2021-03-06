window.IcGravityModalInit = function (forms, ajaxUrl) {
    Vue.component('SweetModal', window.SweetModal.SweetModal);
    Vue.component('SweetModalTab', window.SweetModal.SweetModalTab);

    function parseOptions(forms) {
        const optTypes = {
            enabled: Boolean,
            enableMobileFullscreen: Boolean,
            modalTheme: String,
            modalWidth: String,
            overlayTheme: String,
        };
        const parsedForms = {};
        Object.keys(forms).forEach(formId => {
            const parsedOpts = {};
            const opts = forms[formId];
            Object.keys(opts).forEach(optName => {
                if (optTypes[optName] === Boolean) {
                    parsedOpts[optName] = !!+opts[optName];
                } else {
                    parsedOpts[optName] = opts[optName];
                }
            });
            parsedForms[formId] = parsedOpts;
        });
        return parsedForms;
    }

    const template = `
        <div class="ic-gravity-modals">
            <SweetModal
                v-for="(opts, formId) in forms"
                :key="formId"
                :ref="getModalRef(formId)"
                :icon="icon"
                :width="opts.modalWidth"
                :modal-theme="opts.modalTheme"
                :overlay-theme="opts.overlayTheme"
                :enable-mobile-fullscreen="opts.enableMobileFullscreen"
                @open="$nextTick(() => executeScripts())"
                @close="onModalClose">
                <div :ref="getContentRef(formId)" v-html="getLoadedContent(formId)" />
            </SweetModal>
        </div>
    `;
    const el = document.createElement('div');
    document.body.appendChild(el);
    new Vue({
        el,
        template,
        data: {
            openFormId: null,
            loadedContent: {},
            icon: null,
            forms: parseOptions(forms),
        },
        methods: {
            openModal(formId) {
                const found = this.$refs[`form-${formId}`];
                if (found && found.length > 0) {
                    this.request(formId, res => {
                        this.openFormId = formId;
                        this.loadedContent = {
                            ...this.loadedContent,
                            [formId]: res.responseText
                        };
                        found[0].open();
                    });
                } else {
                    throw Error(`Modal for form ${formId} not found`);
                }
            },
            getModalRef(formId) {
                return 'form-' + formId;
            },
            getContentRef(formId) {
                return 'content-' + formId;
            },
            getLoadedContent(formId) {
                return this.loadedContent[formId];
            },
            handleError() {
                this.icon = "error";
            },
            request(formId, success) {
                const request = new XMLHttpRequest();
                request.open('GET', `${ajaxUrl}?action=ic_gravity_modal_get_form&form_id=${formId}`, true);

                request.onload = function () {
                    if (request.status >= 200 && request.status < 400) {
                        // Success!
                        success(request);
                    } else {
                        // We reached our target server, but it returned an error
                        this.handleError();
                    }
                };

                request.onerror = function () {
                    // There was a connection error of some sort
                    this.handleError();
                };

                request.send();
            },
            getNodeName(elem, name) {
                return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
            },
            executeScripts() {
                const scripts = [];
                const contentRef = this.getContentRef(this.openFormId);
                const wrp = this.$refs[contentRef][0];
                const ret = wrp.childNodes;
                for (let i = 0; ret[i]; i++) {
                    if (scripts && this.getNodeName(ret[i], "script") && (!ret[i].type || ret[i].type.toLowerCase() === "text/javascript")) {
                        scripts.push(ret[i].parentNode ? ret[i].parentNode.removeChild(ret[i]) : ret[i]);
                    }
                }
                for (script in scripts) {
                    this.executeScript(scripts[script]);
                }
            },
            executeScript(elem) {
                const data = (elem.text || elem.textContent || elem.innerHTML || "");

                const head = document.getElementsByTagName("head")[0] || document.documentElement,
                    script = document.createElement("script");
                script.type = "text/javascript";
                script.appendChild(document.createTextNode(data));
                head.insertBefore(script, head.firstChild);
                head.removeChild(script);

                if (elem.parentNode) {
                    elem.parentNode.removeChild(elem);
                }
            },
            handleHashChange() {
                const hash = window.location.hash;
                const regex = /^#gform-(\d+)/gm;
                let matches;

                while ((matches = regex.exec(hash)) !== null) {
                    // This is necessary to avoid infinite loops with zero-width matches
                    if (matches.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }

                    // The result can be accessed through the `matches`-variable.
                    const formId = matches[1];
                    if (formId) this.openModal(formId);
                }
            },
            setHashListener() {
                window.addEventListener('hashchange', this.handleHashChange);
            },
            onModalClose() {
                history.pushState(
                    "",
                    document.title,
                    window.location.pathname + window.location.search,
                );
            }
        },
        mounted() {
            window.IcGravityModalOpen = this.openModal.bind(this);
            this.handleHashChange();
            this.setHashListener();
        }
    })
}